"use strict";

CodeMirror.defineMode("mdm", () => ({
  startState: () => ({ state: "normal" }),

  copyState: ({ state }) => { state },

  token: (stream, state) => {

    // start of line resets everything
    if(stream.sol()) state.state = "normal";

    if(state.state == "normal") {

      if(stream.match("]]")) {
        return "bracket";
      }

      if(stream.match("[[")) {
        state.state = "link";
        return "bracket";
      }

      stream.next();
      return null;

    } else if(state.state == "link") {

      if(stream.skipTo("]]")) {
        state.state = "normal";
        return "link local-link";
      }

      stream.skipToEnd();
      state.state = "normal";
      return null;

    }
  },
}));

window.REPO = (() => {

  const fs = new LightningFS("fs");
  const pfs = fs.promises;
  const dir = "/";

  const startup = (async () => {
    const http = await import("https://unpkg.com/isomorphic-git@beta/http/web/index.js");
    // await git.clone({
    //   fs,
    //   http,
    //   dir,
    //   corsProxy: 'https://cors.isomorphic-git.org',
    //   url: 'https://github.com/ralismark/test-wiki',
    //   singleBranch: true,
    //   depth: 1,
    // });

    console.log("cloned!");
  })();

  const api = {};

  api.list = async () => {
    await startup;

    let entries = [];
    for(const file of await pfs.readdir(dir)) {
      if(file === ".git") continue;
      try {
        let name = file.replace(/\.md$/, "");
        name = decodeURIComponent(name);
        entries.push(name);
      } catch(err) {
        // if we get errors, just ignore the file
        console.warn(`ignoring '${file}':`, err);
      }
    }
    return entries;
  };

  api.read = async (name) => {
    await startup;

    const file = "/" + encodeURIComponent(name) + ".md";
    const content = await pfs.readFile(file);
    return new TextDecoder("utf-8").decode(content);
  };

  api.tryRead = async (name, otherwise = null) => {
    try {
      return await api.read(name);
    } catch(err) {
      return otherwise;
    }
  };

  return api;

})();

class Doc extends EventTarget {
  constructor(fs) {
    super();
    this.docs = {};
  }

  static setContent(doc, content) {
    doc.setValue(content);
    doc.clearHistory();
  }

  static linkCodemirror(cm, doc) {
    cm.swapDoc(doc.linkedDoc({
      sharedHist: true,
    }));
    cm.setOption("mode", "mdm");
    cm.setOption("readOnly", false);
  }

  async importRepo() {
    const files = await REPO.list();
    return await Promise.allSettled(files.map(x => this.getRootDocument(x)));
  }

  async createDocument(slug) {
    const doc = CodeMirror.Doc(await REPO.tryRead(slug, ""), "null");
    return doc;
  }

  async getRootDocument(slug) {
    if(!(slug in this.docs)) {
      const doc = this.createDocument(slug);
      this.docs[slug] = doc;
      this.dispatchEvent(new Event("listchanged"));
    }
    return this.docs[slug];
  }

  knownSlugs() {
    return Object.keys(this.docs);
  }
}

window.DP = new Doc();
DP.importRepo();
