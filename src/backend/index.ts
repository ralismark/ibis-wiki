import { ExternState } from "../extern";
import { IStore, InMemoryStore, LocalStorageStore, S3Store, Store, SummaryChanged } from "./store";
import { assertUnreachable } from "../util";
import { IbisConfig, StoreType } from "../config";
import demoData from "../demoData";
import { FullTextSearch } from "./ftsearch";
import { File } from "./file"

export { File } from "./file"

export function storeFromConfig(config: IbisConfig): IStore {
  switch (config.storeType) {
    case StoreType.None:
      return new InMemoryStore(demoData)
    case StoreType.LocalStorage:
      return new LocalStorageStore()
    case StoreType.S3:
      return new S3Store(config)
    default:
      assertUnreachable(config.storeType)
  }
}

export class Facade {
  readonly store: Store
  readonly listing = new ExternState(new Set<string>())
  readonly fts: FullTextSearch = new FullTextSearch((path: string) => this.store.load(path))

  constructor(provider: IStore) {
    this.store = new Store(provider)

    // NOTE I don't think we need to handle unsubscribe since everything should
    // get garbage collected
    this.store.subscribe(change => this.summaryChangeForListing(change))
    this.store.subscribe(change => this.fts.handleSummaryChanged(change))

    this.store.refresh()
  }

  static fromConfig(config: IbisConfig) {
    return new Facade(storeFromConfig(config))
  }

  openFile(path: string): Promise<File> {
    return File.new(this.store, path)
  }

  private summaryChangeForListing(change: SummaryChanged) {
    if (change.type === "single") {
        let listing = this.listing.getSnapshot()
        if (change.content) {
          if (listing.has(change.path)) return;

          listing = new Set(listing)
          listing.add(change.path)
          this.listing.set(listing)
        } else {
          if (!listing.has(change.path)) return;

          listing = new Set(listing)
          listing.delete(change.path)
          this.listing.set(listing)
        }
    } else if (change.type === "all") {
        this.listing.set(new Set(change.listing.keys()))
    } else assertUnreachable(change)
  }
}

export const FacadeExtern = new ExternState<Facade | null>(null)
