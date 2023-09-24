import { File } from "./file"
import { Store } from "./store"

export class Files {
  private files: Map<string, Promise<File> | WeakRef<File>> = new Map()
  readonly store: Store

  constructor(store: Store) {
    this.store = store
  }

  open(path: string): Promise<File> {
    const file = this.files.get(path)
    if (file instanceof Promise) {
      return file
    } else if (file instanceof WeakRef) {
      const f = file.deref()
      if (f) return Promise.resolve(f)
    }

    // need to load
    const filep = File.new(this.store, path)
    this.files.set(path, filep)
    filep.then(file => this.files.set(path, new WeakRef(file)))
    return filep
  }
}
