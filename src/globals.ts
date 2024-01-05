import { LocalStorageEntry, ScopedLocalStorage } from "./util/scopedLocalStorage";

export const LsIbis = new ScopedLocalStorage("ibis/");
export const LsWal = LsIbis.scoped("wal/");
export const LsConfig: LocalStorageEntry = LsIbis.scoped("config");
export const LsStore = LsIbis.scoped("store/");

export const DEBOUNCE_MS = 2000;
export const STATE_REPLY_TIMEOUT_MS = 100;
export const IDB_FTSEARCH = "ibis/fts";
