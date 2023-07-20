export interface StorageBackend {
  list(): Promise<Array<string>>,
  load(path: string): Promise<null | { etag: string, content: string }>,
  delete(path: string, etag?: string): Promise<void>,
  store_nonempty(path: string, content: string, etag: null | string): Promise<{ etag: string }>,
}

export class MemoryBackend implements StorageBackend {
  pages: { [key: string]: string };

  constructor(pages: { [key: string]: string } = {}) {
    this.pages = pages;
  }

  async list() {
    return Object.keys(this.pages);
  }
  async load(path: string) {
    //await sleep(1000);
    const page = this.pages[path];
    if (page !== undefined) {
      return {
        etag: "*",
        content: page,
      };
    } else {
      return null;
    }
  }
  async delete(path: string, _etag?: string) {
    delete this.pages[path];
  }
  async store_nonempty(path: string, content: string, _etag: string | null) {
    this.pages[path] = content;
    return {etag: "*"};
  }
}

export class LocalStorageBackend implements StorageBackend {
  readonly prefix = "backend:";

  async list() {
    const files = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        files.push(key.substring(this.prefix.length));
      }
    }
    return files;
  }

  async load(path: string) {
    const content = localStorage.getItem(this.prefix + path);
    if (!content) return null;
    return {
      etag: "*",
      content,
    };
  }

  async delete(path: string, _etag?: string) {
    localStorage.removeItem(this.prefix + path);
  }

  async store_nonempty(path: string, content: string, _etag: string | null) {
    localStorage.setItem(this.prefix + path, content);
    return {etag:"*"};
  }
}
