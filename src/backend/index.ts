import { EditorState, Text } from "@codemirror/state";
import { sleep } from "../utils";
import { Etag, Store } from "./store";
import { createContext } from "react";
import { DEBOUNCE_MS, LsWal } from "../globals";
import extensions from "../codemirror/extensions";
import { ExternMemo } from "../extern";
import { EditorStateRef } from "../codemirror/Controlled";
import { endMerge, ofMerging, ofNotMerging } from "../codemirror/merge";

export class File {
  readonly be: Backend
  readonly path: string

  readonly esr: EditorStateRef

  // Remote version we're derived from. Used to ensure we don't overwrite
  // anything when we put (a bit like atomic compare-and-swap).
  //
  // When we're in a conflict, this won't be the latest version of remote we're
  // aware of -- that's remoteEtag.
  private baseEtag: Etag

  // Latest version of remote we know about
  private remoteEtag: Etag

  // Whether we're in a conflicted state or not
  readonly isConflicting = new ExternMemo(() => this.remoteEtag != this.baseEtag);

  private constructor(
    be: Backend,
    path: string,
    state: EditorState,
    baseEtag: Etag,
    remoteEtag: Etag,
  ) {
    this.be = be
    this.path = path
    this.esr = new EditorStateRef(state)
    this.baseEtag = baseEtag
    this.remoteEtag = remoteEtag

    this.esr.subscribe(tr => {
      if (tr instanceof EditorState || tr.docChanged) this.dirty()
    });
  }

  static async new(be: Backend, path: string): Promise<File> {
    const { content: remoteContent, etag: remoteEtag } = await be.store.get(path);
    const stored = LsWal.getItem(path);
    if (stored) {
      const { content: savedContent, etag: savedEtag } = JSON.parse(stored);
      if (savedEtag !== remoteEtag) {
        return new File(
          be,
          path,
          EditorState.create({
            doc: savedContent,
            extensions: [
              extensions,
              ofMerging(remoteContent),
            ],
          }),
          savedEtag,
          remoteEtag,
        );
      } else {
        const f = new File(
          be,
          path,
          EditorState.create({
            doc: savedContent,
            extensions: [
              extensions,
              ofNotMerging(),
            ],
          }),
          savedEtag,
          remoteEtag,
        );
        f.dirty();
        return f;
      }
    } else {
      return new File(
        be,
        path,
        EditorState.create({
          doc: remoteContent,
          extensions: [
            extensions,
            ofNotMerging(),
          ],
        }),
        remoteEtag,
        remoteEtag,
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

  private async put() {
    while (true) {
      if (this.baseEtag !== this.remoteEtag) return; // conflict, don't put

      await sleep(DEBOUNCE_MS);

      // TODO is this one necessary?
      if (this.baseEtag !== this.remoteEtag) return; // conflict, don't put

      const content = this.doc(); // the text that we're gonna put
      const { etag } = content.eq(Text.empty)
        ? await this.be.store.delete(this.path, this.baseEtag)
        : await this.be.store.put(this.path, content.toString(), this.baseEtag);

      // TODO handle this conflicting

      const listingChanged = (this.baseEtag === null) !== (etag === null);

      this.baseEtag = this.remoteEtag = etag;

      if (listingChanged) this.be.listing.signal();

      if (this.doc().eq(content)) {
        // everything is up to date!
        this.clearLS();
        return;
      }

      this.writeLS(); // update etag

      // there's still differences, need to go around again
    }
  }

  // End a conflict by committing the local version to remote
  resolveConflict() {
    if (this.baseEtag === this.remoteEtag) {
      console.error("Attempting to resolveConflict on non-conflicting file", this)
      return
    }

    this.baseEtag = this.remoteEtag
    this.isConflicting.signal()
    this.esr.update({
      effects: [endMerge()],
    })
    this.dirty()
  }

  // helper functions
  private doc(): Text {
    return this.esr.getState().doc;
  }

  private writeLS() {
    LsWal.setItem(this.path, JSON.stringify({
      content: this.doc().toString(),
      etag: this.baseEtag,
    }));
  }

  private clearLS() {
    LsWal.removeItem(this.path);
  }
}

export class Backend {
  pages: { [key: string]: Promise<File> } = {};
  readonly store: Store;
  readonly listing = new ExternMemo(async () => {
    return await this.store.list();
  });

  constructor(store: Store) {
    this.store = store;
    console.log("Backend", this);
  }

  open(path: string): Promise<File> {
    if (!(path in this.pages))
      this.pages[path] = File.new(this, path);
    return this.pages[path];
  }
}

export const BackendContext = createContext<Backend | null>(null);
