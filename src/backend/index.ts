import { EditorState } from "@codemirror/state";
import { sleep } from "../utils";
import { Store } from "./store";
import viewSyncPlugin from "../codemirror/viewSyncPlugin";
import { createContext } from "react";
import { DEBOUNCE_MS, LS_WRITE_BUFFER_PREFIX } from "../globals";

export type Version = Date | null;

export function verLess(a: Version, b: Version): boolean {
  if (a === null) {
    return b !== null;
  } else if (b === null) {
    return true;
  } else {
    return a < b;
  }
}

export type Snapshot = {
  content: string
  version: Version,
}

export interface File {
  // write(content: string): void
  // read(): string
  state(): EditorState
}

export class Backend {
  pages: { [key: string]: Promise<File> } = {};
  readonly store: Store;

  constructor(store: Store) {
    this.store = store;
    console.log("Backend", this);
  }

  open(path: string): Promise<File> {
    if (!(path in this.pages))
      this.pages[path] = this.makeFile(path);
    return this.pages[path];
  }

  private async makeFile(path: string): Promise<File> {
    let { content: remoteContent, version: remoteVer } = await this.store.get(path);
    let localContent: string = remoteContent;

    let runningPut: null | Promise<void> = null;
    const write = (content: string) => {
      localContent = content;
      localStorage.setItem(LS_WRITE_BUFFER_PREFIX + path, JSON.stringify({
        content: localContent,
        version: remoteVer,
      }));

      if (runningPut !== null) return;

      // returns whether we awaited at all
      const doPut = async(): Promise<boolean> => {
        console.log("doPut");
        // NOTE if this becomes a bottleneck, try using @codemirror/state.Text?
        if (localContent === remoteContent) {
          localStorage.removeItem(LS_WRITE_BUFFER_PREFIX + path);
          return false;
        }

        if (localContent === "") {
          const res = await this.store.delete(path, remoteVer);
          remoteVer = res.version;
        } else {
          const res = await this.store.put(path, localContent, remoteVer);
          remoteVer = res.version;
        }

        remoteContent = localContent;
        // we need to update reference version
        localStorage.setItem(LS_WRITE_BUFFER_PREFIX + path, JSON.stringify({
          content: localContent,
          version: remoteVer,
        }));

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
      const { content: savedContent, version: refVer } = JSON.parse(stored) as Snapshot;

      if (verLess(remoteVer, refVer)) {
        console.warn(
          "We went back in time? Reference version for locally cached",
          "changes ", refVer, " is older than remote version ", remoteVer,
        )
      }

      // we have unsaved changes that were derived from refVer
      if (verLess(refVer, remoteVer)) {
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
