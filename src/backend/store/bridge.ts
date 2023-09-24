import { ETag } from "."
import { Feed } from "../../extern"

export type Snapshot = {
  content: string
  etag: ETag
}

export type ListEntry = {
  etag: ETag
}

// IStore is implemented by storage providers. You shouldn't use them directly
// however, but instead use Store, which wraps around them and handles
// invalidation/etc.
export interface IStore {
  list(): Promise<Map<string, ListEntry>>
  get(path: string): Promise<Snapshot>
  put(path: string, content: string, etag: ETag): Promise<{ etag: ETag }>
  delete(path: string, etag: ETag): Promise<void>
}

export type SummaryChanged = {
  type: "single"
  path: string
  etag: ETag
  content: string
} | {
  type: "all"
  listing: Map<string, { etag: ETag }>
}

// Store wraps around implementations of IStore, additionally maintaining ETag
// information.
//
// This is the Bridge design pattern.
export class Store extends Feed<[SummaryChanged]> {
  readonly provider: IStore

  constructor(provider: IStore) {
    super()
    this.provider = provider;
  }

  async write(path: string, content: string, etag: ETag): Promise<{ etag: ETag }> {
    // note that provider.put and provider.delete may throw
    let newEtag: ETag
    if (content) {
      const r = await this.provider.put(path, content, etag);
      newEtag = r.etag
    } else {
      await this.provider.delete(path, etag);
      newEtag = null
    }

    this.signal({
      type: "single",
      path,
      etag: newEtag,
      content,
    })

    return { etag: newEtag }
  }

  async load(path: string): Promise<Snapshot> {
    const snapshot = await this.provider.get(path)

    this.signal({
      type: "single",
      path,
      etag: snapshot.etag,
      content: snapshot.content,
    })

    return snapshot
  }

  // TODO there can be a race condition between refresh and load/write, if the
  // store processes write after refresh, but the write resolves before
  // refresh, causing us to have stale information.

  async refresh() {
    // there may be race conditions between this and load/write
    const listing = await this.provider.list()
    this.signal({
      type: "all",
      listing,
    })
  }
}
