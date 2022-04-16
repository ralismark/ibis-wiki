import Config from "./config.mjs";
import {reportError} from "./error.mjs";

function xhr(prepare) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.addEventListener("load", () => {
      resolve({
        request: req,
        content: req.response,
        status: req.status,
        header: new Proxy({}, {
          get: (obj, prop) => req.getResponseHeader(prop),
        }),

        raise_for_status() {
          if(req.status < 400) return;
          reportError(`Error while loading "${req.responseURL}":
          ${req.statusText}`);
          throw req;
        },
      });
    });
    req.addEventListener("error", e => reject({ request: req, error: e }));

    prepare(req);
  });
}

const webdav_api = {
  async list() {
    const { status, content, raise_for_status } = await xhr(req => {
      req.open("PROPFIND", Config.WEBDAV_URL);
      req.responseType = "document";
      req.setRequestHeader("Depth", "1");
      req.send(`
        <?xml version="1.0" encoding="utf-8"?>
        <propfind xmlns="DAV:">
          <prop>
            <resourcetype xmlns="DAV:"/>
          </prop>
        </propfind>
      `);
    });
    if(status === 405 || status == 501) return []; // 405 Method Not Allowed
    raise_for_status();

    const entries = [];

    for(let resp of content.documentElement.children) {
      const isCollection = resp.querySelector("propstat > prop > resourcetype > collection") !== null;
      if(isCollection) continue;

      const path = resp.querySelector("href").textContent;
      const filename = path.split("/").pop();

      entries.push(filename);
    }

    return entries;
  },

  async load(path) {
    let { content, status, header, raise_for_status } = await xhr(req => {
      req.open("GET", Config.WEBDAV_URL + path);
      req.responseType = "text"

      // https://stackoverflow.com/a/48969579
      req.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
      req.setRequestHeader("Expires", "Tue, 01 Jan 1980 1:00:00 GMT");
      req.setRequestHeader("Pragma", "no-cache");

      req.send();
    });

    // special handling of 404
    if(status === 404) return {etag: null, content: ""};
    raise_for_status();

    return {
      etag: header.ETag || "*", // we "gracefully" degrade to not validating ETag
      content,
    };
  },

  async delete(path, etag) {
    const { header, raise_for_status } = await xhr(req => {
      req.open("DELETE", Config.WEBDAV_URL + path);
      if(Config.ETAGS) {
        if(etag === null)
          req.setRequestHeader("If-None-Match", "*");
        else
          req.setRequestHeader("If-Match", etag);
      }
      req.send();
    });
    raise_for_status();
  },

  async store_nonempty(path, content, etag) {
    const { header, raise_for_status } = await xhr(req => {
      req.open("PUT", Config.WEBDAV_URL + path);
      if(Config.ETAGS) {
        if(etag === null)
          req.setRequestHeader("If-None-Match", "*");
        else
          req.setRequestHeader("If-Match", etag);
      }
      req.send(content);
    });
    raise_for_status();

    return {
      etag: header.ETag || "*", // we "gracefully" degrade to not validating ETag
    }
  },
};

const backend = webdav_api; // TODO s3 support

export async function list() {
  return await backend.list();
}

export async function load(path) {
  const result = await backend.load(path);
  console.log(
    "[api]",
    path, "loaded.",
    "len:", result.content.length,
    "etag:", result.etag,
  );
  return result;
}

export async function store(path, content, etag) {
  if(Config.READONLY) {
    console.log("[api]", path, "store blocked.", "etag:", etag);
    return;
  }

  if(content === "") {
    await backend.delete(path, etag);
    console.log("[api]", path, "cleared.", "etag:", null);
    return null;
  } else {
    const new_etag = await backend.store_nonempty(path, content, etag);
    console.log(
      "[api]",
      path, "stored.",
      "len:", content.length,
      "etag:", new_etag,
    );
    return new_etag;
  }
}
