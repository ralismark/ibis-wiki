export { Store } from "./bridge"
export type { IStore, SummaryChanged } from "./bridge"
export { HTTPError, InMemoryStore, LocalStorageStore, S3Store } from "./providers"

export type ETag = string | null

export class ETagMismatchError extends Error {
	constructor() {
		super("Provided ETag did not match remote content")
	}
}
