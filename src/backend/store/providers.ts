import { ETag, ETagMismatchError } from "."
import { LsStore } from "../../globals";
import { ListEntry, Snapshot, IStore } from "./bridge"
import { AwsClient } from "aws4fetch";

// InMemoryStore is a IStore that stores the files purely in memory,
// providing zero persistence.
export class InMemoryStore implements IStore {
  files: { [path: string]: Snapshot } = {}

  constructor(initial: { [path: string]: string } = {}) {
    for (const [path, content] of Object.entries(initial)) {
      this.put(path, content, null)
    }
  }

  private etag(path: string): ETag {
    return this.files[path]?.etag ?? null
  }

  async list() {
    const out: Map<string, ListEntry> = new Map()
    for (const [path, file] of Object.entries(this.files)) {
      out.set(path, {
        etag: file.etag,
      })
    }
    return out
  }

  async get(path: string) {
    return this.files[path] ?? {
      content: "",
      version: null,
    }
  }

  async put(path: string, content: string, etag: ETag) {
    if (etag !== this.etag(path)) throw new ETagMismatchError()

    etag = (new Date()).valueOf().toString()
    this.files[path] = {
      content,
      etag,
    }
    return { etag }
  }

  async delete(path: string, etag: ETag) {
    if (etag !== this.etag(path)) throw new ETagMismatchError()
    delete this.files[path]
  }
}

// LocalStorage ---------------------------------------------------------------

export class LocalStorageStore implements IStore {
  async list() {
    const out: Map<string, ListEntry> = new Map();
    for (let [k, v] of LsStore.entries()) {
      const val: Snapshot = JSON.parse(v);
      out.set(k, {
        etag: val.etag
      })
    }
    return out
  }

  async get(path: string) {
    const stored = LsStore.getItem(path);
    if (!stored) {
      return {
        content: "",
        etag: null,
      };
    }
    return JSON.parse(stored);
  }

  async put(path: string, content: string, etag: ETag) {
    if (etag !== (await this.get(path)).etag) throw new ETagMismatchError();

    etag = (new Date()).valueOf().toString();
    const stored: Snapshot = {
      content,
      etag,
    };
    LsStore.setItem(path, JSON.stringify(stored));
    return {
      etag,
    };
  }

  async delete(path: string, etag: ETag) {
    if (etag !== (await this.get(path)).etag) throw new ETagMismatchError();

    LsStore.removeItem(path);
  }
}

// S3 Backend -----------------------------------------------------------------

export class HTTPError extends Error {
  constructor(r: Response) {
    super(`${r.status} ${r.statusText}`)
  }
}

export class S3Store implements IStore {
  readonly client: AwsClient
  readonly bucket: string
  readonly prefix: string

  constructor({
    s3AccessKeyId,
    s3SecretAccessKey,
    s3Bucket,
    s3Prefix,
  }: {
    s3AccessKeyId: string,
    s3SecretAccessKey: string,
    s3Bucket: string,
    s3Prefix: string,
  }) {
    this.client = new AwsClient({
      accessKeyId: s3AccessKeyId,
      secretAccessKey: s3SecretAccessKey,
    });
    this.bucket = s3Bucket;
    this.prefix = s3Prefix;
  }

  private constructUrl(pathname: string, params: { [key: string]: string } = {}): string {
    const url = new URL(this.bucket);
    url.pathname = pathname;
    for(let [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return url.toString();
  }

  private childByTag(el: Element, tag: string): Element | null {
    for (let child of el.children) {
      if (child.tagName === tag) return child;
    }
    return null;
  }

  async list() {
    const out: Map<string, ListEntry> = new Map();
    const r: Response = await this.client.fetch(
      this.constructUrl("", {
        "list-type": "2",
        prefix: this.prefix
      })
    );
    if (!r.ok) throw new HTTPError(r);

    // TODO be louder with these parse errors?

    const doc = (new DOMParser).parseFromString(await r.text(), "text/xml");
    for (let contents of doc.querySelectorAll("ListBucketResult > Contents")) {
      const key = this.childByTag(contents, "Key")?.textContent;
      if (!key) {
        console.warn("No <Key> for Contents", contents);
        continue;
      }
      if (!key.startsWith(this.prefix)) {
        console.warn("Contents", contents, "has Key that doesn't start with prefix ", this.prefix);
        continue;
      }

      const etag = this.childByTag(contents, "ETag")?.textContent;
      if (!etag) {
        console.warn("No <ETag> for Contents", contents);
        continue;
      }

      out.set(key.substring(this.prefix.length), {
        etag,
      })
    }
    return out;
  }

  // TODO better handle missing etags? since i think the rest of the app
  // assumes that equal etag implies equal content, which isn't true for
  // missing etags.

  async etag(path: string): Promise<ETag> {
    const r: Response = await this.client.fetch(
      this.constructUrl(this.prefix + path),
      {
        method: "HEAD",
      },
    )
    if (r.status === 404) return null
    if (!r.ok) throw new HTTPError(r)
    return r.headers.get("ETag") ?? "*"
  }

  async get(path: string) {
    const r: Response = await this.client.fetch(this.constructUrl(this.prefix + path));
    if (r.status === 404) return {
      content: "",
      etag: null,
    };
    if (!r.ok) throw new HTTPError(r);
    return {
      content: await r.text(),
      etag: r.headers.get("ETag") ?? "*",
    }
  }

  async put(path: string, content: string, etag: ETag) {
    // S3 doesn't have the necessary APIs to avoid TOCTOU :(
    if (await this.etag(path) !== etag) throw new ETagMismatchError()

    const r: Response = await this.client.fetch(
      this.constructUrl(this.prefix + path),
      {
        method: "PUT",
        body: content,
      },
    )
    if (!r.ok) throw new HTTPError(r)
    return {
      etag: r.headers.get("ETag") ?? "*",
    };
  }

  async delete(path: string, etag: ETag) {
    // S3 doesn't have the necessary APIs to avoid TOCTOU :(
    if (await this.etag(path) !== etag) throw new ETagMismatchError()

    const r: Response = await this.client.fetch(
      this.constructUrl(this.prefix + path),
      {
        method: "DELETE",
      },
    );
    if (!r.ok) throw new HTTPError(r)
  }
}
