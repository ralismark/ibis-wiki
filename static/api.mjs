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

export async function list() {
  const { status, content, raise_for_status } = await xhr(req => {
    req.open("PROPFIND", Config.API_BASE);
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
  if(status === 405) return []; // 405 Method Not Allowed
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
}

export async function load(path) {
  let { content, status, header, raise_for_status } = await xhr(req => {
    req.open("GET", Config.API_BASE + path);
    req.responseType = "text"

    // https://stackoverflow.com/a/48969579
    req.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
    req.setRequestHeader("Expires", "Tue, 01 Jan 1980 1:00:00 GMT");
    req.setRequestHeader("Pragma", "no-cache");

    req.send();
  });

  // we "gracefully" degrade to not validating ETag
  let etag = header.ETag || "*";

  // special handling of 404
  if(status === 404) {
    raise_for_status = () => {}; // don't throw
    content = "";
    etag = null;
  }

  raise_for_status();

  console.log("[api]", path, "loaded.", "etag:", etag);
  return {etag, content};
}

export async function store(path, content, etag) {
  const isDelete = content === "";


  if(Config.READONLY) {
    console.log("[api]", path, "store blocked.", "etag:", etag);
    return isDelete ? null : "*";
  }

  const { header, raise_for_status } = await xhr(req => {
    req.open(isDelete ? "DELETE" : "PUT", Config.API_BASE + path);

    // etag verif
    if(Config.ETAGS) {
      if(etag === null)
        req.setRequestHeader("If-None-Match", "*");
      else
        req.setRequestHeader("If-Match", etag);
    }

    req.send(content);
  });

  raise_for_status();

  // we "gracefully" degrade to not validating ETag
  etag = isDelete ? null : header.ETag || "*";

  console.log("[api]", path, "stored.", "etag:", etag);
  return etag;
}
