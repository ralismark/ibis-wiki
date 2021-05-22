"use strict";

const DP = (() => {
  // imports
  const {EditorState, Annotation} = CM.state;
  const {EditorView, ViewPlugin} = CM.view;

  /*
   * Define the codemirror theme
   */
  const theme = EditorView.baseTheme({
    ".cm-content": {
      fontFamily: "sans-serif",
    },
  });

  /*
   * A plugin to synchronise multiple EditorViews
   */
  function syncPlugin(slug) {
    const listeners = new Set();
    const downstream = Annotation.define(Boolean);

    const plugin = ViewPlugin.define((v) => {
      listeners.add(v);
      return {
        update(viewupdate) {
          // avoid update loops
          if(viewupdate.changes.empty) return;
          for(const tr of viewupdate.transactions) {
            if(tr.annotation(downstream)) return;
          }

          for(let other of listeners) if(other !== v) {
            other.dispatch({
              changes: viewupdate.changes,
              annotations: downstream.of(true),
            });
          }

          plugin.state = viewupdate.state;
        },

        destroy() {
          listeners.delete(v);
        },
      };
    });

    return plugin;
  }

  /*
   * Map from slugs to sync plugins
   */
  const docs = {};

  /*
   * Create a new document for the given slug
   */
  async function create(slug) {
    const content = await api.load(slug) || "";

    const sync = syncPlugin(slug);
    sync.state = EditorState.create({
      doc: content,
      extensions: [CM.basicSetup, sync, theme],
    });

    // TODO saving
    // TODO empty document placeholder

    return sync;
  }

  return new class extends EventTarget {
    get docs() {
      return docs;
    }

    async list() {
      return await api.list();
    }

    async open(slug) {
      if(!(slug in this.docs)) {
        // doesn't exist, so create it
        docs[slug] = create(slug);
      }
      return (await this.docs[slug]).state;
    }
  };
})();
