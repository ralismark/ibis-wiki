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
    req.open("GET", "/api/list");
    req.send();
  });
  raise_for_status();
  return content;
}

const tokenMap = {};

let tokenId = 0;
function newToken() { return tokenId++; }

export function dbg_refreshToken(path) {
  return tokenMap[path] = newToken();
}

export async function load(path) {
  const { content, status, raise_for_status } = await xhr(req => {
    req.responseType = "text"
    req.open("GET", "/api/data/" + path);
    req.send();
  });

  // we don't want to throw if content is null
  if(status !== 404) raise_for_status();

  // fake token handling
  if(!(path in tokenMap)) {
    tokenMap[path] = newToken();
  }
  const token = tokenMap[path];

  if(status === 404) return {token, content: ""};
  return {token, content};
}

export async function store(path, content, token) {
  if(token !== tokenMap[path]) {
    console.warn("[token]", path, "token mismatch!",
      "passed:", token,
      "expected:", tokenMap[path],
    );
    throw {
      status: 412, // conflict
    }
  }

  if(Config.READONLY) return;
  const { raise_for_status } = await xhr(req => {
    req.open("PUT", "/api/data/" + path);
    req.send(content);
  });

  // returns new token
  return tokenMap[path] = newToken();
}
