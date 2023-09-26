import { EditorState, Text } from "@codemirror/state";
import { sleep } from "../util";
import { Store, ETag, ETagMismatchError } from "./store";
import { DEBOUNCE_MS, LsWal } from "../globals";
import extensions from "../codemirror/extensions";
import { ExternMemo, ExternState } from "../extern";
import { EditorStateRef } from "../codemirror/Controlled";
import { setMerging } from "../codemirror/merge";
import { toast } from "react-toastify";

export const NumSyncing = new ExternState<number>(0)

export class File {
  readonly path: string
  readonly store: Store

  readonly esr: EditorStateRef

  // Remote version we're derived from. Used to ensure we don't overwrite
  // anything when we put (a bit like atomic compare-and-swap).
  //
  // When we're in a conflict, this won't be the latest version of remote we're
  // aware of -- that's remoteETag.
  private baseETag: ETag

  // Latest version of remote we know about
  private remoteETag: ETag

  // Whether we're in a conflicted state or not
  readonly isConflicting = new ExternMemo(() => this.remoteETag != this.baseETag);

  private constructor(
    path: string,
    store: Store,
    state: EditorState,
    baseETag: ETag,
    remoteETag: ETag,
  ) {
    this.path = path
    this.store = store
    this.esr = new EditorStateRef(state)
    this.baseETag = baseETag
    this.remoteETag = remoteETag

    this.esr.subscribe(tr => {
      if (tr instanceof EditorState || tr.docChanged) this.dirty()
    });
  }

  static async new(store: Store, path: string): Promise<File> {
    const { content: remoteContent, etag: remoteETag } = await store.load(path);
    const stored = LsWal.getItem(path);
    if (stored) {
      const { content: savedContent, etag: savedETag } = JSON.parse(stored);
      if (savedETag !== remoteETag) {
        // conflicted
        return new File(
          path,
          store,
          EditorState.create({
            doc: savedContent,
            extensions: [
              extensions,
              setMerging(remoteContent),
            ],
          }),
          savedETag,
          remoteETag,
        );
      } else {
        const f = new File(
          path,
          store,
          EditorState.create({
            doc: savedContent,
            extensions: [
              extensions,
              setMerging(null),
            ],
          }),
          savedETag,
          remoteETag,
        );
        f.dirty();
        return f;
      }
    } else {
      return new File(
        path,
        store,
        EditorState.create({
          doc: remoteContent,
          extensions: [
            extensions,
            setMerging(null),
          ],
        }),
        remoteETag,
        remoteETag,
      )
    }
  }

  private runningPut: null | Promise<void> = null

  private dirty() {
    this.writeLS();

    if (this.runningPut !== null) return; // there is already a task running
    this.runningPut = (async () => {
      try {
        await this.put();
      } finally {
        this.runningPut = null
      }
    })();
  }

  // TODO make this less flaky when there's multiple instances open (either
  // from diff tabs, or like react's strict mode)

  private async put() {
    while (true) {
      if (this.baseETag !== this.remoteETag) return; // conflict, don't put

      await sleep(DEBOUNCE_MS);

      // TODO is this one necessary?
      if (this.baseETag !== this.remoteETag) return; // conflict, don't put

      const content = this.doc(); // the text that we're gonna put
      try {
        const { etag } = await this.store.write(this.path, content.toString(), this.baseETag);

        this.baseETag = this.remoteETag = etag;

        if (this.doc().eq(content)) {
          // everything is up to date!
          this.clearLS();
          return;
        }
      } catch(e) {
        if (e instanceof ETagMismatchError) {
          // enter conflicted state
          const { content, etag } = await this.store.load(this.path);
          this.remoteETag = etag;
          this.isConflicting.signal();
          this.esr.update({
            effects: [setMerging(content).effect],
          });

          toast.warn(`Conflicting changes on "${this.path}", please fix manually`)
        } else {
          toast.error(`Couldn't save "${this.path}": ${e}`)
        }

        return;
      }

      this.writeLS(); // update etag

      // there's still differences, need to go around again
    }
  }

  // End a conflict by committing the local version to remote
  resolveConflict() {
    if (this.baseETag === this.remoteETag) {
      console.error("Attempting to resolveConflict on non-conflicting file", this)
      return
    }

    this.baseETag = this.remoteETag
    this.isConflicting.signal()
    this.esr.update({
      effects: [setMerging(null).effect],
    })
    this.dirty()
  }

  // helper functions
  private doc(): Text {
    return this.esr.getState().doc;
  }

  private writeLS() {
    if (LsWal.getItem(this.path) === null) NumSyncing.set(NumSyncing.getSnapshot() + 1)
    LsWal.setItem(this.path, JSON.stringify({
      content: this.doc().toString(),
      etag: this.baseETag,
    }));
  }

  private clearLS() {
    if (LsWal.getItem(this.path) !== null) NumSyncing.set(NumSyncing.getSnapshot() - 1)
    LsWal.removeItem(this.path);
  }
}
