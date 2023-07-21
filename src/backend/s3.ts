import { Store, Etag, ListEntry } from "./store";
import { AwsClient } from "aws4fetch";

export class S3Store implements Store {
  client: AwsClient;
  bucket: string;
  prefix: string;

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

  private constructUrl(pathname: string, params: { [key: string]: string } = {}): URL {
    const url = new URL(this.bucket);
    url.pathname = pathname;
    for(let [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return url;
  }

  private childByTag(el: Element, tag: string): Element | null {
    for (let child of el.children) {
      if (child.tagName === tag) return child;
    }
    return null;
  }

  async list() {
    const out: { [key: string]: ListEntry } = {};
    const r: Response = await this.client.fetch(
      this.constructUrl("", {
        "list-type": "2",
        prefix: this.prefix
      })
    );
    if (!r.ok) throw r;
    const doc = (new DOMParser).parseFromString(await r.text(), "text/xml");
    for(let contents of doc.querySelectorAll("ListBucketResult > Contents")) {
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

      out[key.substring(this.prefix.length)] = {
        etag,
      };
    }
    return out;
  }
  async get(path: string) {
    const r: Response = await this.client.fetch(this.constructUrl(this.prefix + path));
    if (r.status === 404) return {
      content: "",
      etag: null,
    };
    if (!r.ok) throw r;
    return {
      content: await r.text(),
      etag: r.headers.get("ETag"),
    }
  }
  async put(path: string, content: string, _etag: Etag) {
    const r: Response = await this.client.fetch(
      this.constructUrl(this.prefix + path),
      {
        method: "PUT",
        body: content,
      },
    );
    if (!r.ok) throw r;
    return {
      etag: r.headers.get("ETag"),
    };
  }
  async delete(path: string, _etag: Etag) {
    const r: Response = await this.client.fetch(
      this.constructUrl(this.prefix + path),
      {
        method: "DELETE",
      },
    );
    if (!r.ok) throw r;
    return {
      etag: null,
    };
  }
}
