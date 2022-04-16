import $ from "./dollar.mjs";

export const schema = {
  READONLY: {
    help:
      "Don't write modified pages to the backend.",
    default: false,
  },
  SAVE_INTERVAL: {
    help:
      "Minimum time in milliseconds between autosaves.",
    default: 2000,
  },
  DUPLICATE_CARDS: {
    help:
      "When opening a card that is already open, whether to jump to a new copy or the existing one.",
    default: true,
  },
  ETAGS: {
    help:
      "EXPERIMENTAL: use ETags to avoid overwriting external changes.",
    default: false,
  },
  GET_URL: {
    help:
      "A URL (ending in a slash) from which we can GET pages."
      + " Must always be supplied, but only used for init.js, or everything if STORAGE_TYPE=none.",
    default: "../demo-data/",
  },
  STORAGE_TYPE: {
    help:
      "What storage type to use."
      + "\n- none: use GET_URL and in-memory storage for writing."
      + "\n- webdav: use WEBDAV_URL as a WebDAV backend."
      + "\n- s3: use S3. This is not implemented yet",
    options: ["none", "webdav", /*"s3"*/],
    default: "none",
  },
  WEBDAV_URL: {
    help:
      "(only used if STORAGE_TYPE=webdav)"
      + "\nURL ending in a slash used for WebDAV access.",
    default: "",
  },
  S3_ACCESS_KEY_ID: {
    help:
      "(only used if STORAGE_TYPE=s3)"
      + "\nS3 is not implemented yet",
    default: "",
  },
  S3_SECRET_ACCESS_KEY: {
    help:
      "(only used if STORAGE_TYPE=s3)"
      + "\nS3 is not implemented yet",
    default: "",
  },
  S3_BUCKET: {
    help:
      "(only used if STORAGE_TYPE=s3)"
      + "\nS3 is not implemented yet",
    default: "",
  },
};

// add setters and getters
for(let [key, obj] of Object.entries(schema)) {
  obj.name = key;
  obj.set = v => {
    if(typeof(v) !== typeof(obj.default))
      throw `Type mismatch: setting "${key}" (a ${typeof(obj.default)}) to a ${typeof(v)}`;
    localStorage.setItem(key, JSON.stringify(v));
  };
  obj.get = () => {
    const value = localStorage.getItem(key);
    if(value !== null) return JSON.parse(value);
    return obj.default;
  };
}

export function clearConfig() {
  localStorage.clear();
}
