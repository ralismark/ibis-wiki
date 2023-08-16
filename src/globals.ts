import { LocalStorageEntry, ScopedLocalStorage } from "./scopedLocalStorage";

export const LsIbis = new ScopedLocalStorage("ibis/");
export const LsWal = LsIbis.scoped("wal/");
export const LsConfig: LocalStorageEntry = LsIbis.scoped("config");
export const LsStore = LsIbis.scoped("store/");

export const DEBOUNCE_MS = 2000;

console.log("LsWal", LsWal);
