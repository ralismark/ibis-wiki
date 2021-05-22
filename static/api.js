"use strict";

const api = (() => {

  function xhr(prepare) {
    return new Promise((resolve, reject) => {
      let req = new XMLHttpRequest();
      req.addEventListener("load", () => {
        if(req.status >= 400) reject(req);

        resolve({
          content: req.response,
          header: new Proxy({}, {
            get: (obj, prop) => req.getResponseHeader(prop),
          }),
          request: req,
        });
      });
      req.addEventListener("error", () => reject(req));

      prepare(req);
    });
  }

  async function api_list() {
    const { content } = await xhr(req => {
      req.responseType = "json";
      req.open("GET", "/api/list");
      req.send();
    });

    return content;
  }

  async function data_load(path) {
    const { content } = await xhr(req => {
      req.responseType = "text";
      req.open("GET", "/api/data/" + path);
      req.send();
    }).catch(req => {
      if(req.status == 404) return { content: null };
      throw req;
    });

    return content;
  }

  async function data_store(path, content) {
    if(READONLY) return;
    await xhr(req => {
      req.open("PUT", "/api/data/" + path);
      req.send(content);
    });
  }

  return {
    list: api_list,
    load: data_load,
    store: data_store,
  };

})();
