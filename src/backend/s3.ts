import { Snapshot, Version } from ".";
import { Store } from "./store";
import { AwsClient } from "aws4fetch";

// TODO more robust url handling

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

  async get(path: string): Promise<Snapshot> {
    const r: Response = await this.client.fetch(`${this.bucket}${this.prefix}${path}`);
    if (r.status === 404) return {
      content: "",
      version: null,
    };
    if (!r.ok) throw r;
    const lastModified = r.headers.get("Last-Modified");
    return {
      content: await r.text(),
      version: lastModified ? new Date(lastModified) : new Date(),
    }
  }
  async put(path: string, content: string, _refVer: Version): Promise<{ version: Version; }> {
    const r: Response = await this.client.fetch(
      `${this.bucket}${this.prefix}${path}`,
      {
        method: "PUT",
        body: content,
      },
    );
    if (!r.ok) throw r;
    const date = r.headers.get("Date");
    return {
      version: date ? new Date(date) : new Date(),
    };
  }
  async delete(path: string, _refVer: Version): Promise<{ version: Version; }> {
    const r: Response = await this.client.fetch(
      `${this.bucket}${this.prefix}${path}`,
      {
        method: "DELETE",
      },
    );
    if (!r.ok) throw r;
    return {
      version: null,
    };
  }
}
