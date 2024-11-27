import { ETag } from ".";
import { ListEntry, Snapshot, IStore } from "./bridge"

export class GDriveStore implements IStore {
  accessToken: string

  constructor({
    gdriveAccessToken,
    //gdriveTokenExpiry,
  }: {
    gdriveAccessToken: string,
    //gdriveTokenExpiry: string,
  }) {
    this.accessToken = gdriveAccessToken
  }

  async list(): Promise<Map<string, ListEntry>> {
    const r = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: {
        Authorization: "Bearer " + this.accessToken,
      }
    })
    console.log(r, await r.text())

    throw new Error("Method not implemented.");
  }

  async get(path: string): Promise<Snapshot> {
    throw new Error("Method not implemented.");
  }

  async put(path: string, content: string, etag: ETag): Promise<{ etag: ETag; }> {
    throw new Error("Method not implemented.");
  }

  async delete(path: string, etag: ETag): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
