import { ExternState } from "../extern";
import { IStore, InMemoryStore, LocalStorageStore, S3Store, Store, SummaryChanged } from "./store";
import { assertUnreachable } from "../util";
import { Files } from "./files";
import { IbisConfig, StoreType } from "../config";
import demoData from "../demoData";
import { FullTextSearch } from "./ftsearch";

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
  readonly files: Files
  readonly listing = new ExternState(new Set<string>())
  readonly fts: FullTextSearch = new FullTextSearch((path: string) => this.store.load(path))

  constructor(provider: IStore) {
    this.store = new Store(provider)
    this.files = new Files(this.store)

    // NOTE I don't think we need to handle unsubscribe since everything should
    // get garbage collected
    this.store.subscribe(change => this.summaryChangeForListing(change))
    this.store.subscribe(change => this.fts.handleSummaryChanged(change))

    this.store.refresh()
  }

  static fromConfig(config: IbisConfig) {
    return new Facade(storeFromConfig(config))
  }

  private summaryChangeForListing(change: SummaryChanged) {
    if (change.type === "single") {
        const listing = new Set(this.listing.getSnapshot())
        if (change.content) {
          listing.add(change.path)
        } else {
          listing.delete(change.path)
        }
        this.listing.set(listing)
    } else if (change.type === "all") {
        this.listing.set(new Set(change.listing.keys()))
    } else assertUnreachable(change)
  }
}

export const FacadeExtern = new ExternState<Facade | null>(null)
