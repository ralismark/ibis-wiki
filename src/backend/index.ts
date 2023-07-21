import { EditorState } from "@codemirror/state";
import { sleep } from "../utils";
import { Store } from "./store";
import viewSyncPlugin from "../codemirror/viewSyncPlugin";
import { createContext } from "react";
import { DEBOUNCE_MS, LS_WRITE_BUFFER_PREFIX } from "../globals";
import extensions from "../codemirror/extensions";
import { ExternMemo } from "../extern";

export interface File {
  // write(content: string): void
  // read(): string
  state(): EditorState
}

export class Backend {
  pages: { [key: string]: Promise<File> } = {};
  readonly store: Store;
  readonly listing: ExternMemo<Promise<{ [key: string]: {} }>>;

  constructor(store: Store) {
    this.store = store;
    this.listing = new ExternMemo(async () => {
      return await this.store.list();
    });
    console.log("Backend", this);
  }

  open(path: string): Promise<File> {
    if (!(path in this.pages))
      this.pages[path] = this.makeFile(path);
    return this.pages[path];
  }

  private async makeFile(path: string): Promise<File> {
    let { content: remoteContent, etag: remoteEtag } = await this.store.get(path);
    let localContent: string = remoteContent;

    let runningPut: null | Promise<void> = null;
    const write = (content: string) => {
      localContent = content;
      localStorage.setItem(LS_WRITE_BUFFER_PREFIX + path, JSON.stringify({
        content: localContent,
        etag: remoteEtag,
      }));

      if (runningPut !== null) return;

      // returns whether we awaited at all
      const doPut = async(): Promise<boolean> => {
        // NOTE if this becomes a bottleneck, try using @codemirror/state.Text?
        if (localContent === remoteContent) {
          localStorage.removeItem(LS_WRITE_BUFFER_PREFIX + path);
          return false;
        }

        if (localContent === "") {
          const res = await this.store.delete(path, remoteEtag);
          remoteEtag = res.etag;
        } else {
          const res = await this.store.put(path, localContent, remoteEtag);
          remoteEtag = res.etag;
        }
        // we need to update reference version
        localStorage.setItem(LS_WRITE_BUFFER_PREFIX + path, JSON.stringify({
          content: localContent,
          etag: remoteEtag,
        }));

        if ((localContent === "") != (remoteContent === "")) {
          this.listing.signal();
        }

        remoteContent = localContent;

        return true;
      };

      runningPut = (async () => {
        try {
          do {
            await sleep(DEBOUNCE_MS);
          } while(await doPut());
        } finally {
          runningPut = null;
        }
      })();
    };

    // reload saved changes
    const stored = localStorage.getItem(LS_WRITE_BUFFER_PREFIX + path);
    if (stored) {
      const { content: savedContent, etag: refEtag } = JSON.parse(stored);

      // we have unsaved changes that were derived from refVer
      if (refEtag !== remoteEtag) {
        // !!! Merge conflict
        // TODO handle this without data loss. for now just lose changes
      } else {
        write(savedContent);
      }
    }

    let state = EditorState.create({
      doc: localContent,
      extensions: [
        viewSyncPlugin(newState => {
          state = newState;
          write(state.doc.toString());
        }),
        extensions,
      ],
    });

    return {
      state() {
        return state;
      }
    };
  }
}

export const BackendContext = createContext<Backend | null>(null);
