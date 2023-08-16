export interface LocalStorageEntry {
  get(): string | null
  set(value: string): void
  remove(): void
}

export class ScopedLocalStorage implements LocalStorageEntry {
  readonly prefix: string

  constructor(prefix: string = "") {
    this.prefix = prefix
  }

  scoped(prefix: string): ScopedLocalStorage {
    return new ScopedLocalStorage(this.prefix + prefix)
  }

  // entry access
  get(): string | null {
    return localStorage.getItem(this.prefix)
  }

  set(value: string) {
    return localStorage.setItem(this.prefix, value)
  }

  remove() {
    return localStorage.removeItem(this.prefix)
  }

  // scope access
  getItem(key: string): string | null {
    return localStorage.getItem(this.prefix + key)
  }

  setItem(key: string, value: string) {
    return localStorage.setItem(this.prefix + key, value)
  }

  removeItem(key: string) {
    return localStorage.removeItem(this.prefix + key)
  }

  clear() {
    this.keys().forEach(this.removeItem)
  }

  keys(): string[] {
    const out: string[] = []
    for (let i = 0; i < localStorage.length; ++i) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix) && key !== this.prefix) {
        out.push(key.substring(this.prefix.length))
      }
    }
    return out
  }

  entries(): [string, string][] {
    // can't use generator in case localStorage gets modified in the middle
    const out: [string, string][] = []
    for (let i = 0; i < localStorage.length; ++i) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix) && key !== this.prefix) {
        out.push([key.substring(this.prefix.length), localStorage.getItem(key)!])
      }
    }
    return out
  }

}
