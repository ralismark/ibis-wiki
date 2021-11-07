import {extensions as markdown} from "./cm-markdown.mjs";
import basicSetup from "./cm-basicsetup.mjs";
import {syncPlugin} from "./cm-sync.mjs";
import * as api from "./api.mjs";
import $ from "./dollar.mjs";

import {EditorState} from "https://cdn.skypack.dev/@codemirror/state@^0.19.0";
import {EditorView} from "https://cdn.skypack.dev/@codemirror/view@^0.19.0";
import {Text} from "https://cdn.skypack.dev/@codemirror/text@^0.19.0";

export const DP = (() => {

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
   * Map from slugs to their EditorState
   */
  const docs = {};

  /*
   * Create a new document for the given slug
   */
  async function create(slug) {
    const {token, content} = await api.load(slug);
    const text = Text.of(content.split("\n"));


    const sync = syncPlugin(output, slug, text, token);
    return EditorState.create({
      doc: text,
      extensions: [markdown, sync, theme, basicSetup],
    });
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
      return (await this.docs[slug]);
    }
  };

  output.addEventListener("listchanged", () => {
    index_promise = api.list();
    console.log("[index]", "listchanged.", "promise:", index_promise);
  });

  return output;
})();
