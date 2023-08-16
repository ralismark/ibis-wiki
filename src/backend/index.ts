import { EditorState } from "@codemirror/state";
import { sleep } from "../utils";
import { Store } from "./store";
import { createContext } from "react";
import { DEBOUNCE_MS, LS_WRITE_BUFFER_PREFIX } from "../globals";
import extensions from "../codemirror/extensions";
import { ExternMemo } from "../extern";
import { toast } from "react-toastify";
import { EditorStateRef } from "../codemirror/Controlled";

export interface File {
  // write(content: string): void
  // read(): string
  state(): EditorStateRef
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

    let state = new EditorStateRef(
      EditorState.create({
        doc: localContent,
        extensions: [
          extensions,
        ],
      })
    );
    state.subscribe(tr => write(tr.newDoc.toString()));

    let runningPut: null | Promise<void> = null;
    const write = (content: string) => {
      localContent = content;
      localStorage.setItem(LS_WRITE_BUFFER_PREFIX + path, JSON.stringify({
        content: localContent,
        etag: remoteEtag,
      }));

      if (runningPut !== null) return;

      // returns whether we awaited at all and should check if there's new changes
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
        toast.error(
          `Merge conflict on ${path}\n${refEtag} -> ${remoteEtag}`
        );
      } else {
        write(savedContent);
      }
    }

    return {
      state() {
        return state;
      }
    };
  }
}

export const BackendContext = createContext<Backend | null>(null);
