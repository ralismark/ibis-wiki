import Config from "./config.mjs";

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
          if(req.status >= 400) throw req;
        },
      });
    });
    req.addEventListener("error", e => reject({ request: req, error: e }));

    prepare(req);
  });
}

export async function list() {
  const { content, raise_for_status } = await xhr(req => {
    req.responseType = "json";
    req.open("GET", Config.API_BASE + "list");
    req.send();
  });
  raise_for_status();
  return content;
}

export async function load(path) {
  let { content, status, header, raise_for_status } = await xhr(req => {
    req.responseType = "text"
    req.open("GET", Config.API_BASE + "data/" + path);
    req.send();
  });

  // TODO 2021-11-11 clean up this logic

  // we "gracefully" degrade to not validating ETag
  let token = "*";

  // special handling of 404
  if(status === 404) {
    raise_for_status = () => {}; // don't throw
    content = "";
    token = null;
  } else if(Config.ETAGS && header.ETag) {
    token = header.ETag;
  }

  raise_for_status();

  console.log("[api]", path, "loaded.", "etag:", token);
  return {token, content};
}

export async function store(path, content, token) {
  if(Config.READONLY) return;
  const { header, raise_for_status } = await xhr(req => {
    req.open("PUT", Config.API_BASE + "data/" + path);

    // token verif
    if(Config.ETAGS) {
      if(token === null)
        req.setRequestHeader("If-None-Match", "*");
      else
        req.setRequestHeader("If-Match", token);
    }

    req.send(content);
  });

  raise_for_status();

  // new token
  token = "*";
  if(content === "") {
    token = null;
  } else if(Config.ETAGS && header.ETag) {
    token = header.ETag;
  }

  // returns new token
  console.log("[api]", path, "stored.", "etag:", token);
  return token;
}
