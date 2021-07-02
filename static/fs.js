"use strict";

const DP = (() => {
  // imports
  const {EditorState, Annotation} = CM.state;
  const {EditorView, ViewPlugin, WidgetType} = CM.view;
  const {HighlightStyle, tags} = CM.highlight;
  const {tx} = CM;

  // pre-declare
  let output;

  /*
   * Define the codemirror theme
   */
  const theme = EditorView.baseTheme({
    ".cm-content": {
      fontFamily: "sans-serif",
    },
  });

  /*
   * Define highlight style
   */

  function expandCombiners(items, base) {
    if(items.length === 0) return base;
    const rest = expandCombiners(items.slice(1), base);
    const extend = rule => ({
      ...rule,
      ...items[0],
      tag: items[0].tag(rule.tag),
    });
    return rest.concat(rest.map(extend));
  }

  const highlight = HighlightStyle.define([
    // formatting
    ...expandCombiners([
      {tag: tx.withEm, fontStyle: "italic"},
      {tag: tx.withStrong, fontWeight: "bold"},
    ], [
      {tag: tags.content},
    ]),

    // meta tags
    ...expandCombiners([
      {tag: tx.metaFor, color: "rgba(127, 127, 127)"},
    ], [
      {tag: tags.content},
      {tag: tags.heading, fontSize: "1.5em"},
      {tag: tags.monospace, fontFamily: "monospace"},
      {tag: tags.quote},
    ]),
    {tag: tags.meta, color: "rgba(127, 127, 127)"},
    {tag: tags.punctuation, color: "rgba(127, 127, 127)"},

    {tag: tags.link, class: "cm-link"},
    {tag: tx.refLink, class: "cm-link cm-js-reflink"},
    {tag: tx.urlLink, class: "cm-link cm-js-urllink"},

  ]);

  /*
   * Clickable links
   */
  const linkPlugin = EditorView.domEventHandlers({
    mousedown(e, view) {
      const classes = e.target.classList;
      if(classes.contains("cm-js-reflink")) {
        openCard(e.target.innerText.trim());
      } else if(classes.contains("cm-js-urllink")) {
        window.open(e.target.innerText.trim(), "_blank", "noopener,noreferrer");
      } else {
        return false;
      }
      return true;
    }
  });

  /*
   * A plugin to synchronise multiple EditorViews
   */
  function syncPlugin(slug) {
    const listeners = new Set();
    const downstream = Annotation.define(Boolean);

    let plugin;
    let syncing = "";
    let syncedState = null;

    async function syncnow() {
      if(!plugin.state) return;
      const content = plugin.state.doc.toString();
      if(syncing != "waiting") return;
      syncing = "inprogress";

      try {
        await api.store(slug, content);

        console.log("sync", slug, syncedState, plugin.state.doc);
        if(syncedState === null
          || (syncedState.length === 0) !== (plugin.state.doc.length === 0)) {
          // empty <-> nonempty transition
          output.dispatchEvent(new Event("listchanged"));
        }

        syncedState = plugin.state.doc;
      } finally {
        // must be a "inprogress" -> "" transition
        document.body.setAttribute("ibis-syncing", +document.body.getAttribute("ibis-syncing") - 1);
        syncing = "";
      }
    }

    document.addEventListener("visibilitychange", async () => {
      if(document.visibilityState == "hidden") {
        await syncnow();
      }
    });

    plugin = ViewPlugin.define((v) => {
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

          // do sync
          if(syncing) return;
          syncing = "waiting";
          // must be a "" -> "waiting" transition
          document.body.setAttribute("ibis-syncing", +document.body.getAttribute("ibis-syncing") + 1);
          $.sleep(SAVE_INTERVAL).then(syncnow);
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
      extensions: [linkPlugin, highlight, CM.filetype(), sync, theme, CM.basicSetup],
    });

    // TODO empty document placeholder

    return sync;
  }

  output = new class extends EventTarget {
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

  return output;
})();
