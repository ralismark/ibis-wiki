import { ETag, SummaryChanged } from "./store"
import { IDB_FTSEARCH } from "../globals";
import { assertUnreachable, batched } from "../util";
import { Snapshot } from "./store/bridge";
import tokenise from "./tokenise"

// based on <https://gist.github.com/inexorabletash/a279f03ab5610817c0540c83857e4295>

// Version of summaries. Bump this every time the scheme changes, to force refresh.
const VERSION = 1

type FtsRow = {
  path: string
  etag: ETag & string
  terms: string[]
}

console.log("tokenise", tokenise)

export class FullTextSearch {
  private readonly db: Promise<IDBDatabase>
  private readonly fetcher: (path: string) => Promise<Snapshot>

  constructor(fetcher: (path: string) => Promise<Snapshot>) {
    this.db = new Promise((resolve, reject) => {
      const r = indexedDB.open(IDB_FTSEARCH, VERSION);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onupgradeneeded = function() { // function to rebind this so we get the db
        const store = this.result.createObjectStore("fts", { keyPath: "path" })
        store.createIndex("terms", "terms", { multiEntry: true })
      }
    })
    this.fetcher = fetcher
    console.log(this)
  }

  private async tr<T>(
    stores: string | Iterable<string>,
    mode: IDBTransactionMode,
    f: (tr: IDBTransaction) => Promise<T>,
  ): Promise<T>
  private async tr(
    stores: string | Iterable<string>,
    mode: IDBTransactionMode,
    f: (tr: IDBTransaction) => void,
  ): Promise<void>
  private async tr<T>(
    stores: string | Iterable<string>,
    mode: IDBTransactionMode,
    f: (tr: IDBTransaction) => Promise<T> | void,
  ) {
    const tr = (await this.db).transaction(stores, mode);
    const trPromise =  new Promise<void>((resolve, reject) => {
      tr.oncomplete = () => resolve();
      tr.onerror = () => reject(tr.error);
      tr.onabort = () => reject(new Error("IndexedDB abort")); // TODO directly show this to user instead?
    });

    const p = f(tr);

    await trPromise;

    if (p instanceof Promise) {
      return await p;
    } else {
      return p;
    }
  }

  private r<T>(r: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async handleSummaryChanged(ev: SummaryChanged) {
    if (ev.type === "single") {
      await this.tr("fts", "readwrite", async tr => {
        const fts = tr.objectStore("fts")
        const etag = (await this.r(fts.get(ev.path)) as FtsRow | null)?.etag
        if (etag !== ev.etag) {
          if (ev.etag !== null) {
            const row: FtsRow = {
              path: ev.path,
              etag: ev.etag,
              terms: tokenise(ev.content),
            }
            fts.put(row)
          } else {
            fts.delete(ev.path)
          }
        }
      })
    } else if (ev.type === "all") {
      const remListing = new Map(ev.listing);

      // figure out which rows we need to fetch
      await this.tr("fts", "readwrite", async tr => {
        const fts = tr.objectStore("fts")
        let r = fts.openCursor()
        let cursor
        while ((cursor = await this.r(r)) !== null) {
          const row = cursor.value as FtsRow
          const listing = remListing.get(row.path)

          if (listing?.etag === null) {
            console.log("[FTS]", "remove row:", row)
            cursor.delete()
          } else if (listing?.etag === row.etag) {
            remListing.delete(row.path)
          }

          cursor.continue()
        }
      })

      // fetch those rows
      const rowsp = Array.from(remListing.keys()).map(async path => {
        const snap = await this.fetcher(path)
        if (snap.content === null) {
          console.warn("fetched empty file for non-empty etag")
          return null
        }

        const row: FtsRow = {
          path,
          etag: snap.etag!,
          terms: tokenise(snap.content),
        }
        console.log("[FTS]", "insert row:", row)
        return row
      })

      // insert those rows
      await batched(
        rowsp,
        rows => this.tr("fts", "readwrite", tr => {
          const fts = tr.objectStore("fts")
          for (const row of rows) fts.put(row)
        }),
        err => {
          console.log(err)
        }
      )
    } else assertUnreachable(ev)
  }

  search(query: string): Promise<string[]> {
    const terms = tokenise(query)
    const out: string[] = []
    if (!terms) return Promise.resolve(out)

    return new Promise(async resolve => {
      await this.tr("fts", "readonly", tr => {
        const index = tr.objectStore("fts").index("terms")
        let outstanding = 0
        const reqs = terms.map(term => {
          const r = index.openCursor(term)
          ++outstanding
          r.onsuccess = () => {
            if (--outstanding === 0) barrier()
          }
          return r
        })

        function barrier() {
          const cursors = reqs.map(r => r.result)
          if (cursors.includes(null)) {
            resolve(out)
            return
          }

          let min: string = cursors[0]!.value.path
          for (const c of cursors) {
            if (indexedDB.cmp(c!.value.path, min) < 0) {
              min = c!.value.path
            }
          }

          let allMin = true
          for (const c of cursors) {
            if (c!.value.path === min) {
              ++outstanding
              c!.continue()
            } else {
              allMin = false
            }
          }

          if (allMin) out.push(min)
        }
      })
    })
  }
}
