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
    return Object.keys(this.docs);
  }

  /*
   * helper for open() to create a new (unnamed) document
   */
  async create(slug) {
    const doc = CodeMirror.Doc("", "mdm");
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
      this.dispatchEvent(new Event("listchanged"));
    }
    const doc = await this.docs[slug];
    return doc;
  }
};

const DP = new DocumentProvider();
