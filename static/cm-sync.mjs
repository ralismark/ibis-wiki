import * as api from "./api.mjs";
import Config from "./config.mjs";

import {Annotation} from "@codemirror/state";
import {ViewPlugin} from "@codemirror/view";
import {Text} from "@codemirror/text";

export const syncingSlugs = new Set();

function updateIndicator() {
  document.body.setAttribute("ibis-syncing", Array.from(syncingSlugs).join(" "));
}

class Synchroniser {
  constructor(slug, content, etag, callbacks) {
    this.slug = slug; // type: string

    // Compare these two to determine if we want to sync
    this.etag = etag;
    this.remoteContent = content; // type: @codemirror/text.Text
    this.localContent = content; // type: @codemirror/text.Text

    this.syncPromise = null; // type: Promise | null

    this.callbacks = callbacks;

    console.log("[sync]", slug, "creating Synchroniser.", "this:", this);
  }

  async handleConflict() {
    console.warn("[sync]", this.slug, "merge conflict.");

    const {etag, content} = await api.load(this.slug);
    const text = Text.of(content.split("\n"));

    console.log("[sync]", this.slug, "resolved merge config.", "etag:", etag, "to:", text);
    this.etag = etag;
    this.remoteContent = text;

    // TODO 2021-11-07 actually merge the input
    this.callbacks.onConflictResolution(text);
  }

  async syncNow() {
    // snapshot the content we're saving
    const content = this.localContent; // type: @codemirror/text.Text

    console.log("[sync]", this.slug, "starting sync.",
      "content:", content,
      "etag:", this.etag,
    );

    try {
      this.etag = await api.store(this.slug, content.toString(), this.etag);
      this.remoteContent = content;
    } catch(e) {
      if(e.status === 412) {
        return await this.handleConflict();
      }

      console.error("[sync]", this.slug, "sync failed.",
        "error:", e
      );
      return;
    }

    console.log("[sync]", this.slug, "sync succeeded.", "etag:", this.etag);

    if((content.length === 0) != (this.remoteContent.length === 0)) {
      this.callbacks.onListUpdate();
    }

    if(!this.remoteContent.eq(this.localContent)) {
      // we need to sync again
      console.log("[sync]", this.slug, "want another sync.");
      await $.sleep(Config.SAVE_INTERVAL);
      await this.syncNow();
    }
  }

  setContent(content) {
    this.localContent = content;

    if(this.syncPromise !== null) return;

    this.syncPromise = (async () => {
      this.onRequestedSync(this.slug);

      try {
        await $.sleep(Config.SAVE_INTERVAL);
        await this.syncNow();
      } finally {
        this.syncPromise = null;
        this.onFulfiledSync(this.slug);
      }
    })();
  }
};

export function syncPlugin(eventTarget, slug, content, etag) {
  const views = new Set();
  const downstream = Annotation.define(Boolean); // to avoid update loops

  const synchroniser = new Synchroniser(
    slug,
    content,
    etag,
    {
      onRequestedSync(slug) {
        syncingSlugs.add(this.slug);
        document.body.setAttribute("ibis-syncing", Array.from(syncingSlugs).join(" "));
      },
      onFulfiledSync(slug) {
        syncingSlugs.delete(this.slug);
        document.body.setAttribute("ibis-syncing", Array.from(syncingSlugs).join(" "));
      },
      onListUpdate() {
        eventTarget.dispatchEvent(new Event("listchanged"));
      },
      onConflictResolution(merged) {
        for(let view of views) {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: merged },
            annotations: downstream.of(true),
          });
        }
      },
    }
  );

  return ViewPlugin.define(self => {
    views.add(self);
    return {
      update(viewUpdate) {
        // avoid update loops
        if(viewUpdate.changes.empty) return;
        for(const tr of viewUpdate.transactions) {
          if(tr.annotation(downstream)) return;
        }

        // send updates to other views
        for(let other of views) if(other !== self) {
          other.dispatch({
            changes: viewUpdate.changes,
            annotations: downstream.of(true),
          });
        }

        // do sync
        synchroniser.setContent(viewUpdate.state.doc);
      },

      destroy() {
        views.delete(self);
      },
    };
  });
}
