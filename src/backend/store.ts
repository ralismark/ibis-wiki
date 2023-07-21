import { LS_STORE_PREFIX } from "../globals"

// tagged type
export type Etag = any & { readonly __tag: unique symbol };

export type Snapshot = {
  content: string
  etag: Etag,
}

export type ListEntry = {
  etag: Etag,
}

// TODO exceptions for store operations
export interface Store {
  list(): Promise<{ [key: string]: ListEntry }>
  get(path: string): Promise<Snapshot>
  put(path: string, content: string, etag: Etag): Promise<{ etag: Etag }>
  delete(path: string, etag: Etag): Promise<{ etag: Etag }>
}

export class InMemoryStore implements Store {
  files: { [key: string]: Snapshot } = {}

  constructor(initial: { [key: string]: string } = {}) {
    for(const [k, v] of Object.entries(initial)) {
      this.put(k, v, null);
    }
    console.log("NullStore", this);
  }

  async list() {
    const out: { [key: string]: ListEntry } = {}
    for (let [path, file] of Object.entries(this.files)) {
      out[path] = {
        etag: file.etag,
      };
    }
    return out;
  }

  async get(path: string) {
    return this.files[path] ?? {
      content: "",
      version: null,
    };
  }
  async put(path: string, content: string, _etag: Etag) {
    const etag = (new Date()).valueOf();
    this.files[path] = {
      content,
      etag,
    };
    return {
      etag,
    };
  }
  async delete(path: string, _etag: Etag) {
    delete this.files[path];
    return {
      etag: null,
    }
  }
}

export class LoggingStore implements Store {
  readonly store: Store

  constructor(store: Store) {
    this.store = store;
  }

  async list() {
    console.log("LIST <-", {});
    const ret = await this.store.list();
    console.log("LIST ->", ret);
    return ret;
  }
  async get(path: string) {
    console.log("GET <-", {path});
    const ret = await this.store.get(path);
    console.log("GET ->", ret);
    return ret;
  }
  async put(path: string, content: string, etag: Etag) {
    console.log("PUT <-", {path, content, etag});
    const ret = await this.store.put(path, content, etag);
    console.log("PUT ->", ret);
    return ret;
  }
  async delete(path: string, etag: Etag) {
    console.log("DELETE <-", {path, etag});
    const ret = await this.store.delete(path, etag);
    console.log("DELETE ->", ret);
    return ret;
  }
}

export class LocalStorageStore implements Store {
  constructor() {
    console.log("LocalStorageStore", this);
  }

  async list() {
    const out: { [key: string]: ListEntry } = {};
    for (let i = 0; i < localStorage.length; ++i) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_STORE_PREFIX)) {
        const val: Snapshot = JSON.parse(localStorage.getItem(key)!);
        out[key.substring(LS_STORE_PREFIX.length)] = {
          etag: val.etag,
        }
      }
    }
    return out;
  }
  async get(path: string) {
    const stored = localStorage.getItem(LS_STORE_PREFIX + path);
    if (!stored) {
      return {
        content: "",
        etag: null,
      };
    }
    return JSON.parse(stored);
  }
  async put(path: string, content: string, _etag: Etag) {
    const etag = (new Date()).valueOf();
    const stored: Snapshot = {
      content,
      etag,
    };
    localStorage.setItem(LS_STORE_PREFIX + path, JSON.stringify(stored));
    return {
      etag,
    };
  }
  async delete(path: string, _etag: Etag) {
    localStorage.removeItem(LS_STORE_PREFIX + path);
    return {
      etag: null,
    };
  }
}
