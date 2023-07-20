import { Snapshot, Version } from "."
import { LS_STORE_PREFIX } from "../globals"

// TODO exceptions for store operations
export interface Store {
  get(path: string): Promise<Snapshot>
  put(path: string, content: string, refVer: Version): Promise<{ version: Version }>
  delete(path: string, refVer: Version): Promise<{ version: Version }>
}

export class InMemoryStore implements Store {
  files: { [key: string]: Snapshot } = {}

  constructor(initial: { [key: string]: string } = {}) {
    for(const [k, v] of Object.entries(initial)) {
      this.put(k, v, null);
    }
    console.log("NullStore", this);
  }

  async get(path: string): Promise<Snapshot> {
    return this.files[path] ?? {
      content: "",
      version: null,
    };
  }
  async put(path: string, content: string, _refVer: Version): Promise<{ version: Version }> {
    const version = new Date();
    this.files[path] = {
      content,
      version,
    };
    return {
      version,
    };
  }
  async delete(path: string, _refVer: Version): Promise<{ version: Version }> {
    delete this.files[path];
    return {
      version: null,
    }
  }
}

export class LoggingStore implements Store {
  readonly store: Store

  constructor(store: Store) {
    this.store = store;
  }

  async get(path: string): Promise<Snapshot> {
    console.log("GET <-", {path});
    const ret = await this.store.get(path);
    console.log("GET ->", ret);
    return ret;
  }
  async put(path: string, content: string, refVer: Version): Promise<{ version: Version }> {
    console.log("PUT <-", {path, content, refVer});
    const ret = await this.store.put(path, content, refVer);
    console.log("PUT ->", ret);
    return ret;
  }
  async delete(path: string, refVer: Version): Promise<{ version: Version }> {
    console.log("DELETE <-", {path, refVer});
    const ret = await this.store.delete(path, refVer);
    console.log("DELETE ->", ret);
    return ret;
  }
}

export class LocalStorageStore implements Store {
  constructor() {
    console.log("LocalStorageStore", this);
  }

  async get(path: string): Promise<Snapshot> {
    const stored = localStorage.getItem(LS_STORE_PREFIX + path);
    if (!stored) {
      return {
        content: "",
        version: null,
      };
    }
    const j = JSON.parse(stored);
    return {
      content: j.content,
      version: new Date(j.version),
    };
  }
  async put(path: string, content: string, _refVer: Version): Promise<{ version: Version }> {
    const version = new Date();
    const stored: Snapshot = {
      content: content,
      version: version,
    };
    localStorage.setItem(LS_STORE_PREFIX + path, JSON.stringify(stored));
    return {
      version,
    };
  }
  async delete(path: string, _refVer: Version): Promise<{ version: Version }> {
    localStorage.removeItem(LS_STORE_PREFIX + path);
    return {
      version: null,
    };
  }
}
