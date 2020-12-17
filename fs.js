"use strict";

CodeMirror.defineMode("mdm", () => ({
  startState: () => ({ state: "normal" }),

  copyState: ({ state }) => { state },

  token: (stream, state) => {

    if(state.state == "skiptoend") {
      stream.skipToEnd();
      state.state = "normal";
      return null;
    }

    if(stream.sol()) {
      // forbid multi-line formatting
      state.state = "normal";

      let heading = stream.match(/#{1,6}/);
      if(heading) return `line-h${heading.length} line-h meta`;

    }

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

  // for ease of debugging
  window.pfs = pfs;

  const api = {};

  api.initialised = async () => {
    const files = await pfs.readdir("/");
    return files.includes(".git");
  };

  const startup = (async () => {
    if(!await api.initialised()) {
      const http = await import("https://unpkg.com/isomorphic-git@beta/http/web/index.js");

      await git.clone({
        fs,
        http,
        dir,
        corsProxy: 'https://cors.isomorphic-git.org',
        url: 'https://github.com/ralismark/test-wiki',
        singleBranch: true,
        depth: 1,
      });

      console.log("cloned!");
    }

    await $.sleep(FAKE_DELAY);
  })();

  function file2slug(name) {
    name = name.replace(/\.md$/, "");
    name = decodeURIComponent(name);
    return name;
  }

  function slug2file(name) {
    return "/" + encodeURIComponent(name) + ".md";
  }

  api.list = async () => {
    await startup;

    let entries = [];
    for(const file of await pfs.readdir(dir)) {
      if(file === ".git") continue;
      try {
        entries.push(file2slug(file));
      } catch(err) {
        // if we get errors, just ignore the file
        console.warn(`ignoring '${file}':`, err);
      }
    }
    return entries;
  };

  api.read = async (name) => {
    await startup;

    const content = await pfs.readFile(slug2file(name), { encoding: "utf8" });
    return content;
  };

  api.tryRead = async (name, otherwise = null) => {
    try {
      return await api.read(name);
    } catch(err) {
      console.log(`couldn't read slug '${name}':`, err);
      return otherwise;
    }
  };

  api.write = async (name, content) => {
    await pfs.writeFile(slug2file(name), content, { encoding: "utf8" });
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

    // syncing to filesystem
    doc.on("change", batchify(FS_UPDATE_INTERVAL, async () => {
      const content = doc.getValue();
      console.log(slug, ":", "writing changes...");
      await REPO.write(slug, content);
      await $.sleep(FAKE_DELAY);
      console.log(slug, ":", "writing changes done");
    }, PENDING_LATCHES));

    await $.sleep(FAKE_DELAY);

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

  async knownSlugs() {
    return Object.keys(this.docs);
  }
}

window.DP = new Doc();
DP.importRepo();
