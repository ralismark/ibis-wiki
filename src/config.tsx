import { useEffect, useMemo, useState } from "react"
import "./config.css"
import { LS_CONFIG_KEY } from "./globals";

export const enum StoreType {
  None = "none",
  LocalStorage = "localstorage",
  S3 = "s3",
}

export type IbisConfig = {
  storeType: StoreType,
  s3AccessKeyId: string,
  s3SecretAccessKey: string,
  s3Bucket: string,
  s3Prefix: string,
}

const DefaultIbisConfig: IbisConfig = {
  storeType: StoreType.None,
  s3AccessKeyId: "",
  s3SecretAccessKey: "",
  s3Bucket: "",
  s3Prefix: ""
};

function saveConfig(cfg: IbisConfig) {
  localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(cfg));
}

export function loadConfig(): IbisConfig {
  const raw = localStorage.getItem(LS_CONFIG_KEY);
  if (raw === null) return DefaultIbisConfig;
  const loaded = JSON.parse(raw);
  if (!(loaded instanceof Object)) return DefaultIbisConfig;

  return {
    ...DefaultIbisConfig,
    ...loaded,
  }
}

export function Config(props: { onChange: (cfg: IbisConfig) => void }) {
  const cfg = useMemo(loadConfig, []);
  const [storeType, setStoreType] = useState(cfg.storeType);
  const [s3AccessKeyId, setS3AccessKeyId] = useState(cfg.s3AccessKeyId);
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState(cfg.s3SecretAccessKey);
  const [s3Bucket, setS3Bucket] = useState(cfg.s3Bucket);
  const [s3Prefix, setS3Prefix] = useState(cfg.s3Prefix);

  const handleSubmit = () => {
    const cfg: IbisConfig = {
      storeType,
      s3AccessKeyId,
      s3SecretAccessKey,
      s3Bucket,
      s3Prefix,
    };
    saveConfig(cfg);
    props.onChange(cfg);
  };

  useEffect(() => {
    handleSubmit();
  }, []);

  return <details>
    <summary>Configuration Options</summary>
    <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
      <label>
        Storage
        <select
          value={storeType}
          onChange={e => setStoreType(e.target.value as StoreType)}
        >
          <option value="none">(demo/ephemeral)</option>
          <option value="localstorage">Browser Storage</option>
          <option value="s3">S3-compatible</option>
        </select>
      </label>

      <fieldset disabled={storeType !== StoreType.S3}>
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
