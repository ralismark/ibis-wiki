"use strict";

class DocumentProvider extends EventTarget {
  constructor() {
    super();

    this.docs = {};
  }

  /*
   * list the document names that currently exist
   */
  async list() {
    return await api.list();
  }

  /*
   * helper for open() to create a new (unnamed) document
   */
  async create(slug) {
    const doc = CodeMirror.Doc("", "mdm");
    const content = await api.load(slug);

    if(content === null) {
      // underlying doesn't exist, so we do something special
      const placeholder = "[click here to create document]";
      doc.setValue(placeholder);
      doc.markText({line:0, ch:0}, {line:0, ch:placeholder.length}, {
        shared: true,
        readOnly: true,
        className: "cm-link cm-js-click cm-js-click-unlock",

        inclusiveLeft: true,
        inclusiveRight: true,

        atomic: true,
        selectLeft: false,
        selectRight: false,
      });
    } else {
      doc.setValue(content);
    }

    let wasEmpty = content == null ? null : content == "";
    let saving = false;
    doc.on("change", async (_, event) => {
      // TODO implement a better sync algo
      console.log("change", event);

      if(saving) return;
      saving = true;
      await $.sleep(SAVE_INTERVAL);

      const content = doc.getValue();
      await api.store(slug, content);
      saving = false;

      const isEmpty = content == "";
      if(isEmpty != wasEmpty) {
        console.log("empty status of", slug, ":", isEmpty, "<-", wasEmpty);
        this.dispatchEvent(new Event("listchanged"));
      }
      wasEmpty = isEmpty;
    });

    await $.sleep(FAKE_DELAY);
    return doc;
  }

  /*
   * open a new document
   */
  async open(slug) {
    if(!(slug in this.docs)) {
      // doesn't exist, so create it
      const doc = this.create(slug);
      this.docs[slug] = doc;
    }
    const doc = await this.docs[slug];
    return doc;
  }
};

const DP = new DocumentProvider();
