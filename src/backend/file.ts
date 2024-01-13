import { EditorState, Text, Transaction } from "@codemirror/state"
import { assertUnreachable, sleep } from "../util"
import { Store, ETag, ETagMismatchError } from "./store"
import { DEBOUNCE_MS, LsWal, STATE_REPLY_TIMEOUT_MS } from "../globals"
import extensions from "../codemirror/extensions"
import { ExternMemo, ExternState } from "../extern"
import { EditorStateRef } from "../codemirror/Controlled"
import { setMerging } from "../codemirror/merge"
import { stateFromJSON, stateToJSON, trFromJSON, trToJSON } from "../codemirror/share"
import { toast } from "react-toastify"

// TODO when we close a file before it's put, it's not actually put

export const NumDirty = new ExternState<number>(0)
export const NumSyncing = new ExternState<number>(0)

// Representation of a file in local storage
type StashedRepr = {
  content: string,
  etag: ETag, // TODO rename this to baseETag
}

// For debugging, so it's easier to track instances
let counter = 0

type MsgRequestState = {
  type: "requestState",
}
type MsgState = {
  type: "state",
  state: unknown, // from stateToJSON
  lastSaved: string[], // from Text.toJSON
  baseETag: ETag,
  remoteETag: ETag,
}
type MsgUpdate = {
  type: "update",
  tr?: unknown,
  lastSaved?: string[],
  baseETag?: ETag,
  remoteETag?: ETag,
}

type Msg = MsgRequestState | MsgState | MsgUpdate

/**
 * File is represents a single file.
 *
 * # File Version
 *
 * Conceptually, there are two or three versions of each file:
 *
 * 1. Latest local copy of the file, including any not-yet-synced changes.
 * 2. The latest (known) version in the store.
 *
 * (There's actually also a third -- the version from which our local copy
 * diverged from the store -- but this cannot be fetched and is rarely used.)
 *
 * These two can diverge significantly when:
 *
 * - A file continues being edited after the application loses internet (and
 *   cannot sync).
 * - A file is edited on another instance of this application while this
 *   instance isn't open.
 *
 * # Notes
 *
 * Currently, we don't correctly handle file state when there are multiple
 * instances open on different tabs in the same browser.
 *
 * When doing things with file state, it's very useful to know which version
 * you're thinking about. For example, full text search operates using the
 * _store_ version, disregarding local changes that haven't been synced.
 */
export class File {
  readonly id: number = counter++

  readonly path: string
  readonly store: Store

  readonly bc: BroadcastChannel

  // Editor state i.e. the contents of the file.
  readonly esr: EditorStateRef

  // Remote version we're derived from. Used to ensure we don't overwrite
  // anything when we put (a bit like atomic compare-and-swap).
  //
  // When we're in a conflict, this won't be the latest version of remote we're
  // aware of -- that's remoteETag.
  private baseETag: ETag

  // Latest version of remote we know about. The same as baseETag, except during
  // a conflict, in which case remoteETag is the version we're comparing
  // against.
  //
  // We need to store this in order to set baseETag when we finish resolving a
  // conflict.
  private remoteETag: ETag

  // Last document that was saved. This is used to determine whether there are
  // unsaved edits.
  private lastSaved: Text

  // --------------------------------------------------------------------------

  // Whether we're in a conflicted state or not
  readonly isConflicting = new ExternMemo(() => this.remoteETag != this.baseETag)

  readonly abort: AbortController = new AbortController()

  private constructor(
    path: string,
    store: Store,
    bc: BroadcastChannel,
    state: EditorState,
    baseETag: ETag,
    remoteETag: ETag,
    lastSaved: Text
  ) {
    this.path = path
    this.store = store
    this.bc = bc
    this.esr = new EditorStateRef(state)
    this.baseETag = baseETag
    this.remoteETag = remoteETag
    this.lastSaved = lastSaved

    this.bc.onmessage = ev => {
      const msg: Msg = ev.data
      console.debug("[file]", this.path, this.id, "recv", msg)
      if (msg.type === "requestState") {
        const reply: MsgState = {
          type: "state",
          state: stateToJSON(this.esr.getState()),
          lastSaved: this.lastSaved.toJSON(),
          baseETag: this.baseETag,
          remoteETag: this.remoteETag,
        }
        console.debug("[file]", this.path, this.id, "send", reply)
        bc.postMessage(reply)
      } else if (msg.type === "state") {
        // do nothing
        // TODO verify that our state matches the one we saw?
      } else if (msg.type === "update") {
        if (msg.tr !== undefined) {
          // will dirty via esr subscription
          this.esr.update(trFromJSON(msg.tr as any, this.esr.getState()))
        }
        if (msg.lastSaved !== undefined) {
          this.lastSaved = Text.of(msg.lastSaved)
        }
        if (msg.baseETag !== undefined) {
          this.baseETag = msg.baseETag
          this.isConflicting.signal() // TODO we might be triggering this more than needed
        }
        if (msg.remoteETag !== undefined) {
          this.remoteETag = msg.remoteETag
          this.isConflicting.signal() // TODO we might be triggering this more than needed
        }
      } else assertUnreachable(msg)
    }

    const unsub = this.esr.subscribe(tr => {
      console.debug("[file]", this.path, this.id, "tr", tr)
      if (!tr.annotation(Transaction.remote)) {
        const msg: MsgUpdate = {
          type: "update",
          tr: trToJSON(tr),
        }
        console.debug("[file]", path, this.id, "send", msg)
        this.bc.postMessage(msg)
      }

      if (/*tr instanceof EditorState ||*/ tr.docChanged) {
        this.dirty()
      }
    })

    if (!this.lastSaved.eq(this.doc())) {
      this.dirty()
    }

    const close = () => {
      bc.close()
      unsub()
      console.debug("[file]", this.path, this.id, "close")
    }
    if (this.abort.signal.aborted) close()
    else this.abort.signal.addEventListener("abort", close)

    console.debug("[file]", this.path, this.id, "construct", this)
  }

  /**
   * new wraps the constructor, handling the logic for loading the file from
   * another instance, or localstorage/store.
   */
  static async new(store: Store, path: string): Promise<File> {
    console.debug("[file]", path, "new")
    const bc = new BroadcastChannel(`ibis/file/${path}`)

    type Ret = { state: EditorState, lastSaved: Text, baseETag: ETag, remoteETag: ETag }
    const { state, lastSaved, baseETag, remoteETag } = await new Promise<Ret>(async resolve => {
      const done = new AbortController()

      // try getting the state from another instance
      bc.onmessage = ev => {
        const msg: Msg = ev.data
        console.debug("[file]", path, "recv", msg)
        if (msg.type === "state") {
          done.abort()
          bc.onmessage = null
          resolve({
            state: stateFromJSON(msg.state),
            lastSaved: Text.of(msg.lastSaved),
            baseETag: msg.baseETag,
            remoteETag: msg.remoteETag,
          })
        }
      }
      const msg: MsgRequestState = { type: "requestState" }
      console.debug("[file]", path, "send", msg)
      bc.postMessage(msg)

      await sleep(STATE_REPLY_TIMEOUT_MS)

      // otherwise, load from localstorage & remote
      try {

        await navigator.locks.request(`ibis/file/${path}/fetch`, {
          signal: done.signal
        }, async () => {
          // NOTE There may be a race condition between:
          //
          // 1. Another tab fetches and broadcasts state, which we receive
          // 2. Us acquiring this lock and trying to fetch
          //
          // This can be fixed by either waiting STATE_REPLY_TIMEOUT_MS again,
          // or by giving the abort signal to store.load

          const { content: remoteContent, etag: remoteETag } = await store.load(path)
          if (done.signal.aborted) return // more or less fix the above issue
          const stashed: StashedRepr | null = JSON.parse(LsWal.getItem(path) ?? "null")

          const conflict = stashed !== null && stashed.etag !== remoteETag
          const remoteText = Text.of(remoteContent.split(/\r?\n/))

          const out = {
            state: EditorState.create({
              doc: stashed?.content ?? remoteContent,
              extensions,
            }).update({
              // We can't just do mergingDoc.of, see codemirror/merge.ts for
              // why (it's a big HACK).
              effects: setMerging.of(conflict ? remoteText : null),
            }).state,
            lastSaved: remoteText,
            baseETag: stashed ? stashed.etag : remoteETag,
            remoteETag: remoteETag,
          }
          // If file was opened in another tab at the same time, they'll also be
          // trying to acquire this lock & fetch the file. Send them the state
          // to abort that.
          const msg: MsgState = {
            type: "state",
            state: stateToJSON(out.state),
            lastSaved: out.lastSaved.toJSON(),
            baseETag: out.baseETag,
            remoteETag: out.remoteETag,
          }
          console.debug("[file]", path, "send", msg)
          bc.postMessage(msg)

          bc.onmessage = null
          resolve(out)
        })

      } catch(e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          // catch abort
        } else {
          throw e
        }
      }
    })

    return new this(
      path,
      store,
      bc,
      state,
      baseETag,
      remoteETag,
      lastSaved,
    )
  }

  private runningPut: null | Promise<void> = null

  private shouldPut(): boolean {
    return this.baseETag === this.remoteETag && !this.lastSaved.eq(this.doc())
  }

  private dirty() {
    this.stash()

    if (this.runningPut !== null) return // there is already a task running
    this.runningPut = (async () => {
      NumDirty.set(NumDirty.getSnapshot() + 1)
      try {
        while (this.shouldPut()) {
          // TODO abort lock if we receive a broadcast that the file got synced
          await navigator.locks.request(`ibis/file/${this.path}/put`, {
            signal: this.abort.signal,
          }, async () => {
            if (!this.shouldPut()) return

            await sleep(DEBOUNCE_MS)

            const content = this.doc()
            if (!this.shouldPut()) return // TODO is this needed?

            try {
              NumSyncing.set(NumSyncing.getSnapshot() + 1)
              const { etag } = await this.store.write(
                this.path,
                content.toString(),
                this.baseETag,
              )
              this.baseETag = this.remoteETag = etag
            } catch(e) {
              if (e instanceof ETagMismatchError) {
                // enter conflicted state
                const { content, etag } = await this.store.load(this.path)
                this.remoteETag = etag
                const tr = this.esr.update({
                  effects: setMerging.of(Text.of(content.split(/\r?\n/))),
                  annotations: Transaction.remote.of(true), // suppress so we can do it atomically
                })
                this.isConflicting.signal()

                const msg: MsgUpdate = {
                  type: "update",
                  tr: trToJSON(tr),
                  remoteETag: etag,
                }
                console.debug("[file]", this.path, this.id, "send", msg)
                this.bc.postMessage(msg)

                toast.warn(`Conflicting changes on "${this.path}", please fix manually`)
                console.debug("[file]", this.path, this.id, "conflict", this.remoteETag, this.baseETag)
              } else {
                toast.error(`Couldn't save "${this.path}": ${e}`)
              }

              return
            } finally {
              NumSyncing.set(NumSyncing.getSnapshot() - 1)
            }

            this.lastSaved = content
            this.stash() // update etag
            const msg: MsgUpdate = {
              type: "update",
              lastSaved: content.toJSON(),
              baseETag: this.baseETag,
              remoteETag: this.remoteETag,
            }
            console.debug("[file]", this.path, this.id, "send", msg)
            this.bc.postMessage(msg)
          })
        }
        if (this.baseETag === this.remoteETag) this.clearStash()
      } catch(e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          // catch abort
        } else {
          throw e
        }
      } finally {
        NumDirty.set(NumDirty.getSnapshot() - 1)
        this.runningPut = null
      }
    })()
  }

  // End a conflict by committing the local version to remote
  resolveConflict() {
    if (this.baseETag === this.remoteETag) {
      console.error("Attempting to resolveConflict on non-conflicting file", this)
      return
    }

    this.baseETag = this.remoteETag
    const tr = this.esr.update({
      effects: setMerging.of(null),
      annotations: Transaction.remote.of(true), // suppress so we can do it atomically
    })
    this.isConflicting.signal()
    this.dirty()

    const msg: MsgUpdate = {
      type: "update",
      tr: trToJSON(tr),
      baseETag: this.baseETag,
    }
    console.debug("[file]", this.path, this.id, "send", msg)
    this.bc.postMessage(msg)
  }

  // helper functions
  private doc(): Text {
    return this.esr.getState().doc
  }

  private stash() {
    const stashed: StashedRepr = {
      content: this.doc().toString(),
      etag: this.baseETag,
    }
    console.debug("[file]", this.path, this.id, "stash", stashed)
    LsWal.setItem(this.path, JSON.stringify(stashed))
  }

  private clearStash() {
    console.debug("[file]", this.path, this.id, "clearStash")
    LsWal.removeItem(this.path)
  }
}
