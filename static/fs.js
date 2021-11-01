"use strict";

const Language = (() => {

  // imports
  const {md} = CM;
  const {styleTags, HighlightStyle, Tag} = CM.highlight;
  const t = CM.highlight.tags;

  const RefLinkDelim = { resolve: "RefLink", mark: "RefLinkMark" };
  const RefLink = {
    defineNodes: ["RefLink", "RefLinkMark"],
    parseInline: [{
      name: "reflink",
      before: "Link",
      parse(cx, next, pos) {
        if(next == 91 /* [ */ && cx.char(pos + 1) == 91)
          return cx.addDelimiter(RefLinkDelim, pos, pos + 2, true, false);
        if(next == 93 /* ] */ && cx.char(pos + 1) == 93)
          return cx.addDelimiter(RefLinkDelim, pos, pos + 2, false, true);
        return -1;
      }
    }],
  }

  // new tags
  const tx = {
    refLink: Tag.define(t.link),
    urlLink: Tag.define(t.link),

    ulMark: Tag.define(t.annotation),
    olMark: Tag.define(t.annotation),
  };

  const tagSpec = {
    // special bits
    RefLinkMark: t.squareBracket,
    RefLink: tx.refLink,
    URL: tx.urlLink,

    // formatting
    "Emphasis/...": t.emphasis,
    "StrongEmphasis/...": t.strong,
    EmphasisMark: t.punctuation,
    "Strikethrough/...": t.strikethrough,
    StrikethroughMark: t.punctuation,

    // headings
    HeaderMark: t.punctuation,
    "ATXHeading1/... SetextHeading1/...": t.heading1,
    "ATXHeading2/... SetextHeading2/...": t.heading2,
    "ATXHeading3/...": t.heading3,
    "ATXHeading4/...": t.heading4,
    "ATXHeading5/...": t.heading5,
    "ATXHeading6/...": t.heading6,

    // lists
    "BulletList/ListIem/ListMark": tx.ulMark,
    "OrderedList/ListIem/ListMark": tx.olMark,
    "ListItem/...": t.list,

    // codeblocks
    CodeMark: t.punctuation,
    "InlineCode FencedCode CodeText": t.monospace,
    CodeInfo: t.labelName, // TODO(2021-11-03) is this the right tag?

    // misc things
    HorizontalRule: t.contentSeparator,
    "Blockquote/...": t.quote,
    QuoteMark: t.punctuation,
  };

  const parser = md.parser.configure([
    md.Strikethrough,
    RefLink,
    {props: [styleTags(tagSpec)]},
  ]);
  window.showParse = x => CM.longParse(parser, x);

  return [
    CM.makeLang({
      parser: parser,
      languageData: {},
    }),
    HighlightStyle.define([
      // fallbacks
      {tag: t.punctuation, color: "rgb(127.5, 127.5, 127.5)"},

      {tag: tx.refLink, class: "cm-link cm-js-reflink"},
      {tag: tx.urlLink, class: "cm-link cm-js-urllink"},

      // standard formatting tags
      {tag: t.emphasis, fontStyle: "italic"},
      {tag: t.strong, fontWeight: "bold"},
      {tag: t.monospace, fontFamily: "monospace"},
      {tag: t.strikethrough, textDecoration: "line-through"},

      // headings
      {tag: t.heading1, fontSize: "1.5em"},
      {tag: t.heading2, fontSize: "1.4em"},
      {tag: t.heading3, fontSize: "1.3em"},
      {tag: t.heading, fontSize: "1.2em"},
    ]),
  ]

})();

const DP = (() => {
  // imports
  const {EditorState, Annotation} = CM.state;
  const {EditorView, ViewPlugin, WidgetType} = CM.view;
  const {HighlightStyle, tags} = CM.highlight;

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
   * Clickable links
   */
  const linkPlugin = EditorView.domEventHandlers({
    mousedown(e, view) {
      const classes = e.target.classList;
      if(classes.contains("cm-js-reflink")) {
        openCard(e.target.innerText.trim());
      } else if(classes.contains("cm-js-urllink")) {
        window.open(e.target.innerText.replace(/^\s*<\s*|\s*>\s*$/g, ""), "_blank", "noopener,noreferrer");
      } else {
        return false;
      }
      return true;
    }
  });

  const syncingSlugs = new Set();

  /*
   * A plugin to synchronise multiple EditorViews
   */
  function syncPlugin(slug) {
    const listeners = new Set();
    const downstream = Annotation.define(Boolean);

    let plugin;
    let syncStage = ""; // "" or "requested" or "in-progress"
    let syncedState = null;

    async function syncnow() {
      if(!plugin.state) return;

      try {
        const content = plugin.state.doc.toString();
        console.log("[sync]", slug, "-", syncStage, "-> in-progress");
        syncStage = "in-progress";

        await api.store(slug, content);

        console.log("[sync]", slug, "- api call done", syncedState, plugin.state.doc);
        if(syncedState === null
          || (syncedState.length === 0) !== (plugin.state.doc.length === 0)) {
          // empty <-> nonempty transition
          output.dispatchEvent(new Event("listchanged"));
        }

        syncedState = plugin.state.doc;
      } finally {
        if(syncStage === "in-progress") {
          // no further requests i.e. in-progress -> empty
          console.log("[sync]", slug, "-", syncStage, "-> <empty>");
          syncStage = "";

          syncingSlugs.delete(slug);
          document.body.setAttribute("ibis-syncing", Array.from(syncingSlugs).join(" "));
        } else {
          // got update while we were syncing -- sync again
          await syncnow();
        }
      }
    }

    function wantsync() {
      const oldSyncStage = syncStage;
      console.log("[sync]", slug, "-", syncStage, "-> requested");
      syncStage = "requested";

      syncingSlugs.add(slug);
      document.body.setAttribute("ibis-syncing", Array.from(syncingSlugs).join(" "));

      if(oldSyncStage === "") {
        // don't have scheduled sync
        $.sleep(SAVE_INTERVAL).then(syncnow);
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
          wantsync();
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
      extensions: [linkPlugin, Language, sync, theme, CM.basicSetup],
    });

    // TODO empty document placeholder

    return sync;
  }

  /* Index provider */
  let index_promise = api.list(); // promise with the latest index

  output = new class extends EventTarget {
    get docs() {
      return docs;
    }

    async list(force=false) {
      if(force) index_promise = api.list();
      return await index_promise;
    }

    async open(slug) {
      if(!(slug in this.docs)) {
        // doesn't exist, so create it
        docs[slug] = create(slug);
      }
      return (await this.docs[slug]).state;
    }
  };

  output.addEventListener("listchanged", () => {
    index_promise = api.list();
    console.log("[index]", "listchanged", index_promise);
  });

  return output;
})();
