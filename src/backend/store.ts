import { Snapshot, Version } from "."

export interface Store {
  get(path: string): Promise<Snapshot>
  put(path: string, content: string, refVer: Version): Promise<{ version: Version }>
  delete(path: string, refVer: Version): Promise<{ version: Version }>
}

export class NullStore implements Store {
  files: { [key: string]: Snapshot } = {}

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
