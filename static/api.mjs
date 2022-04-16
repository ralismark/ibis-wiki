import {schema} from "./config.mjs";
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
          if(200 <= req.status && req.status <= 299) return;
          reportError(`Error while loading "${req.responseURL}": ${req.statusText}`);
          throw req;
        },
      });
    });
    req.addEventListener("error", e => reject({ request: req, error: e }));

    prepare(req);
  });
}

class WebdavStorage {
  async list() {
    const { status, content, raise_for_status } = await xhr(req => {
      req.open("PROPFIND", schema.WEBDAV_URL.get());
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
  }

  async load(path) {
    let { content, status, header, raise_for_status } = await xhr(req => {
      req.open("GET", schema.WEBDAV_URL.get() + path);
      req.responseType = "text";

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
  }

  async delete(path, etag) {
    const { header, raise_for_status } = await xhr(req => {
      req.open("DELETE", schema.WEBDAV_URL.get() + path);
      if(schema.ETAGS.get()) {
        if(etag === null)
          req.setRequestHeader("If-None-Match", "*");
        else
          req.setRequestHeader("If-Match", etag);
      }
      req.send();
    });
    raise_for_status();
  }

  async store_nonempty(path, content, etag) {
    const { header, raise_for_status } = await xhr(req => {
      req.open("PUT", schema.WEBDAV_URL.get() + path);
      if(schema.ETAGS.get()) {
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
  }
};

class NoneStorage {
  constructor() {
    // in-memory store of page contents
    this.pages = {};
  }

  async list() {
    // try the best we can
    return Object.keys(this.pages);
  }

  async load(path) {
    // try getting from local storage
    const saved_content = this.pages[path];
    if(saved_content !== undefined) {
      return {etag: "*", content: saved_content};
    }

    let { content, status, raise_for_status } = await xhr(req => {
      req.open("GET", schema.GET_URL.get() + path);
      req.responseType = "text";

      // https://stackoverflow.com/a/48969579
      req.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
      req.setRequestHeader("Expires", "Tue, 01 Jan 1980 1:00:00 GMT");
      req.setRequestHeader("Pragma", "no-cache");

      req.send();
    });

    // special handling of 404
    if(status === 404) return {etag: null, content: ""};
    raise_for_status();

    return {etag: "*", content};
  }

  async delete(path, etag) {
    // TODO maybe more rigorous checking?
    delete this.pages[path];
  }

  async store_nonempty(path, content, etag) {
    this.pages[path] = content;
    return {etag: "*"};
  }
};

export class S3Storage {
  constructor() {
    this.aws = (async () => {
      const { AwsClient } = await import("aws4fetch");
      return new AwsClient({
        accessKeyId: schema.S3_ACCESS_KEY_ID.get(),
        secretAccessKey: schema.S3_SECRET_ACCESS_KEY.get(),
      });
    })();
  }

  async fetch(...args) {
    const resp = await (await this.aws).fetch(...args);
    return {
      resp,
      raise_for_status() {
        if(resp.ok) return;
        reportError(`Error while loading "${url}": ${resp.status} ${resp.statusText}`);
        throw resp;
      },
    };
  }

  async list() {
    const s3prefix = schema.S3_PREFIX.get();
    const {resp, raise_for_status} = await this.fetch(`${schema.S3_BUCKET.get()}?list-type=2&prefix=${s3prefix}`);
    raise_for_status();
    const doc = (new DOMParser).parseFromString(await resp.text(), "text/xml");

    const entries = [];
    for(let entry of doc.documentElement.children) {
      if(entry.tagName !== "Contents")
        continue;

      const path = entry.querySelector("Key").textContent;
      if(!path.startsWith(s3prefix)) {
        reportError(`Got object that didn't start with S3_PREFIX: "${path}"`);
        continue;
      }

      entries.push(path.slice(s3prefix.length));
    }

    return entries;
  }

  async load(path) {
    const {resp, raise_for_status} = await this.fetch(
      `${schema.S3_BUCKET.get()}${schema.S3_PREFIX.get()}${path}`
    );
    if(resp.status === 404) return {etag: null, content: ""};
    raise_for_status();
    console.log(resp);
    return {
      etag: resp.headers.get("ETag") || "*",
      content: await resp.text(),
    };
  }

  async delete(path, etag) {
    const {resp, raise_for_status} = await this.fetch(
      `${schema.S3_BUCKET.get()}${schema.S3_PREFIX.get()}${path}`,
      {
        method: "DELETE",
      }
    );
    raise_for_status();
  }

  async store_nonempty(path, content, etag) {
    // TODO the S3 api just doesn't support anything like webdav's If-Match

    const {resp, raise_for_status} = await this.fetch(
      `${schema.S3_BUCKET.get()}${schema.S3_PREFIX.get()}${path}`,
      {
        method: "PUT",
        body: content,
      }
    );
    raise_for_status();

    return {
      etag: resp.headers.get("ETag") || "*",
    };
  }
};


const backend = (() => {
  const backend_mapping = {
    "none": NoneStorage,
    "webdav": WebdavStorage,
    "s3": S3Storage,
  };
  const backend = backend_mapping[schema.STORAGE_TYPE.get()];
  if(backend === undefined) {
    reportError(
      `"${schema.STORAGE_TYPE.get()}" is not a valid STORAGE_TYPE, must be one of `
      + Object.keys(backend_mapping).map(x => `"${x}"`).join(", ")
    );
    return new NoneStorage;
  }
  return new backend;
})();

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

export async function store(path, content, old_etag) {
  if(schema.READONLY.get()) {
    console.log("[api]", path, "store blocked.", "etag:", old_etag);
    return;
  }

  if(content === "") {
    await backend.delete(path, old_etag);
    console.log("[api]", path, "cleared.", "etag:", null);
    return null;
  } else {
    const {etag} = await backend.store_nonempty(path, content, old_etag);
    console.log(
      "[api]",
      path, "stored.",
      "len:", content.length,
      "etag:", etag,
    );
    return etag;
  }
}
