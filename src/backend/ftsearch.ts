import { ETag, SummaryChanged } from "./store"
import { IDB_FTSEARCH } from "../globals";
import { assertUnreachable, batched } from "../util";
import { Snapshot } from "./store/bridge";
import { tokenise, outlinks } from "./tokenise"
import { toast } from "react-toastify";

// based on <https://gist.github.com/inexorabletash/a279f03ab5610817c0540c83857e4295>

// Version of summaries. Bump this every time the scheme changes, to force refresh.
const VERSION = 2

type FtsRow = {
  path: string
  etag: ETag & string
  terms: string[]
  refs: string[]
}

export interface IFullTextSearch {
  handleSummaryChanged(ev: SummaryChanged): any
  search(query: string): Promise<string[]>
  backlinks(path: string): Promise<string[]>
  all(each: (row: FtsRow) => void): Promise<void>
}

export class FullTextSearch {
  private readonly db: Promise<IDBDatabase>
  private readonly fetcher: (path: string) => Promise<Snapshot>

  constructor(fetcher: (path: string) => Promise<Snapshot>) {
    this.db = new Promise((resolve, reject) => {
      const r = indexedDB.open(IDB_FTSEARCH, VERSION);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onupgradeneeded = function() { // function to rebind this so we get the db
        // delete all object stores
        for (const os of this.result.objectStoreNames) {
          this.result.deleteObjectStore(os)
        }

        const store = this.result.createObjectStore("fts", { keyPath: "path" })
        store.createIndex("terms", "terms", { multiEntry: true })
        store.createIndex("refs", "refs", { multiEntry: true })
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
    // TODO It seems like fts sometimes gets stuck in a high cpu utilisation
    // state when the page is idle, burning CPU handling ev.type == "all"
    // updates.

    if (ev.type === "single") {
      const tok = (await tokenise)

      await this.tr("fts", "readwrite", async tr => {
        const fts = tr.objectStore("fts")
        const etag = (await this.r(fts.get(ev.path)) as FtsRow | null)?.etag
        if (etag !== ev.etag) {
          if (ev.etag !== null) {
            const row: FtsRow = {
              path: ev.path,
              etag: ev.etag,
              terms: tok(ev.content),
              refs: outlinks(ev.content),
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

        await new Promise(resolve => {
          const r = fts.openCursor()
          r.onsuccess = () => {
            const cursor = r.result
            if (cursor) {
              const row = cursor.value as FtsRow
              const listing = remListing.get(row.path)

              if (listing === undefined || listing.etag === null) {
                console.log("[FTS]", "remove row:", row)
                cursor.delete()
              } else if (listing.etag === row.etag) {
                remListing.delete(row.path)
              }

              cursor.continue()
            } else {
              resolve(undefined)
            }
          }
        })
      })

      if (remListing.size === 0) return


      let progress = 0
      const toastId = toast.loading(`Reindexing ${remListing.size} notes`, {
        progress: 0,
        autoClose: 1,
      })

      try {
        console.log("[FTS]", "reindexing " + remListing.size + " rows")

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
            terms: (await tokenise)(snap.content),
            refs: outlinks(snap.content),
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

            progress += rows.length
            toast.update(toastId, { progress: progress / remListing.size })
          }),
          err => {
            console.log(err)
          }
        )
      } finally {
        toast.done(toastId)
      }
    } else assertUnreachable(ev)
  }

  private marchCursors(cursorReqs: IDBRequest<IDBCursorWithValue | null>[], each: (row: FtsRow) => void): Promise<void> {
    // IndexedDB api is gnarly so we need resolve function to complete the
    // promise
    return new Promise(async resolve => {
      if (cursorReqs.length === 0) return resolve()

      // we implement a "barrier" a la https://en.cppreference.com/w/cpp/thread/barrier.html
      // in order to essentially Promise.all on cursors advancing

      let outstanding = 0 // number of cursor continues we're waiting to resolve

      for (const r of cursorReqs) {
        ++outstanding // for initial advance
        r.onsuccess = () => {
          if (--outstanding === 0) barrier()
        }
      }

      // handle each "step" of cursors
      function barrier() {
        const cursors = cursorReqs.map(r => r.result)
        if (cursors.includes(null)) {
          // a cursor has reached the end, so there won't be any more results
          resolve()
          return
        }

        const getKey = (c: IDBCursorWithValue | null) => c!.value.path

        // get min cursor key via reduce
        let minKey: string = getKey(cursors[0])
        for (const c of cursors) {
          if (indexedDB.cmp(getKey(c), minKey) < 0) minKey = getKey(c)
        }

        // advance all cursors pointing to min value
        let advancedAll = true
        for (const c of cursors) {
          if (getKey(c) === minKey) {
            ++outstanding
            c!.continue()
          } else {
            advancedAll = false
          }
        }

        // if we advanced all cursors, this means that all the cursors pointed
        // to the same FtsRow (and thus was part of all filters) -- emit it
        if (advancedAll) each(cursors[0]!.value)
      }
    })
  }

  async search(query: string): Promise<string[]> {
    const terms = (await tokenise)(query)
    if (terms.length === 0) {
      return []
    }

    return await this.tr("fts", "readonly", async tr => {
      const matchedPaths: string[] = []

      const index = tr.objectStore("fts").index("terms")
      await this.marchCursors(
        terms.map(term => index.openCursor(term)),
        row => matchedPaths.push(row.path),
      )

      return matchedPaths
    })
  }

  backlinks(path: string): Promise<string[]> {
    path = path.trim()
    if (path === "") return Promise.resolve([])

    return this.tr("fts", "readonly", async tr => {
      const rows = await this.r(tr.objectStore("fts").index("refs").getAll(path));
      return rows.map((r: FtsRow) => r.path)
    })
  }

  async all(each: (row: FtsRow) => void): Promise<void> {
    await this.tr("fts", "readonly", async tr => {
      await this.marchCursors(
        [tr.objectStore("fts").openCursor()],
        each,
      )
    })
  }
}

export const DummyFullTextSearch: IFullTextSearch = {
  handleSummaryChanged(ev: SummaryChanged): any {
  },
  async search(query: string): Promise<string[]> {
    return []
  },
  async backlinks(path: string): Promise<string[]> {
    return []
  },
  async all(each: (row: FtsRow) => void): Promise<void> {
    return
  },
}
