import { useEffect, useMemo, useState } from "react"
import "./config.css"

const LS_CONFIG_KEY = "config";

export const enum StorageType {
  None = "none",
  LocalStorage = "localstorage",
  S3 = "s3",
}

export type IbisConfig = {
  storageType: StorageType,
  s3AccessKeyId: string,
  s3SecretAccessKey: string,
  s3Bucket: string,
  s3Prefix: string,
}

const DefaultIbisConfig: IbisConfig = {
    storageType: StorageType.None,
    s3AccessKeyId: "",
    s3SecretAccessKey: "",
    s3Bucket: "",
    s3Prefix: ""
};

function SaveConfig(cfg: IbisConfig) {
  localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(cfg));
}

export function LoadConfig(): IbisConfig {
  const raw = localStorage.getItem(LS_CONFIG_KEY);
  if (raw === null) return DefaultIbisConfig;
  const loaded = JSON.parse(raw);
  if (!(loaded instanceof Object)) return DefaultIbisConfig;

  return {
    storageType: loaded.storageType ?? "none",
    s3AccessKeyId: loaded.s3AccessKeyId ?? "",
    s3SecretAccessKey: loaded.s3SecretAccessKey ?? "",
    s3Bucket: loaded.s3Bucket ?? "",
    s3Prefix: loaded.s3Prefix ?? "",
  }
}

export function Config(props: { onChange: (cfg: IbisConfig) => void }) {
  const cfg = useMemo(LoadConfig, []);
  const [storageType, setStorageType] = useState(cfg.storageType);
  const [s3AccessKeyId, setS3AccessKeyId] = useState(cfg.s3AccessKeyId);
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState(cfg.s3SecretAccessKey);
  const [s3Bucket, setS3Bucket] = useState(cfg.s3Bucket);
  const [s3Prefix, setS3Prefix] = useState(cfg.s3Prefix);

  const handleSubmit = () => {
    const cfg: IbisConfig = {
      storageType,
      s3AccessKeyId,
      s3SecretAccessKey,
      s3Bucket,
      s3Prefix,
    };
    SaveConfig(cfg);
    props.onChange(cfg);
  };

  useEffect(() => {
    handleSubmit();
  }, []);

  return <details>
    <summary>Configuration Options</summary>
    <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
      <label>
        Backend
        <select
          value={storageType}
          onChange={e => setStorageType(e.target.value as StorageType)}
        >
          <option value="none">(none)</option>
          <option value="localstorage">Browser Storage</option>
          <option disabled={true} value="s3">S3-compatible</option>
        </select>
      </label>

      <fieldset disabled={storageType !== StorageType.S3}>
        <legend>S3 Options</legend>

        <label>
          Access Key ID
          <input
            type="text"
            value={s3AccessKeyId}
            onChange={e => setS3AccessKeyId(e.target.value)}
          />
        </label>

        <label>
          Secret Access Key
          <input
            type="text"
            value={s3SecretAccessKey}
            onChange={e => setS3SecretAccessKey(e.target.value)}
          />
        </label>

        <label>
          Bucket URL
          <input
            type="text"
            placeholder="https://bucket.s3.us-east-1.amazonaws.com/"
            value={s3Bucket}
            onChange={e => setS3Bucket(e.target.value)}
          />
        </label>

        <label>
          (optional) Object Prefix
          <input
            type="text"
            value={s3Prefix}
            onChange={e => setS3Prefix(e.target.value)}
          />
        </label>
      </fieldset>

      <button
        type="submit"
      >
        Apply
      </button>
    </form>
  </details>
}