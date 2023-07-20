import { Extension, Text } from "@codemirror/state";
import { StorageBackend } from "../fs";
import { sleep } from "../utils";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";

const DEBOUNCE_MS = 1000;

export class Persister {
	readonly backend: StorageBackend;
	readonly path: string;

	etag: string | null;
	remoteContent: Text;
	localContent: Text;

	syncTask: Promise<void> | null = null;

	constructor(
		backend: StorageBackend,
		path: string,
		etag: string | null,
		content: Text,
	) {
		this.backend = backend;
		this.path = path;
		this.etag = etag;
		this.remoteContent = content;
		this.localContent = content;
	}

	private async doSync() {
		while (true) {
			await sleep(DEBOUNCE_MS);
			if (this.remoteContent.eq(this.localContent)) return;

			// TODO error recovery
			const localStr = this.localContent.toString();
			if (localStr === "") {
				await this.backend.delete(this.path, this.etag!);
				this.etag = null;
			} else {
				const { etag } = await this.backend.store_nonempty(this.path, this.localContent.toString(), this.etag);
				this.etag = etag;
			}
			this.remoteContent = this.localContent;
		}
	}

	setContent(content: Text) {
		this.localContent = content;

		if (this.syncTask !== null) return;
		this.syncTask = (async () => {
			try {
				await this.doSync();
			} finally {
				this.syncTask = null;
			}
		})();
	}

	get extension(): Extension {
		return ViewPlugin.define(() => ({
			update: (update: ViewUpdate) => {
				this.setContent(update.state.doc);
			}
		}));
	}
}
