import { Fragment, useEffect, useId, useMemo, useReducer, useState } from "react"
import { LsConfig } from "./globals";
import "./config.css";

export const enum StoreType {
  None = "none",
  LocalStorage = "localstorage",
  S3 = "s3",
}

export type IbisConfig = {
  enableFts: boolean,

  storeType: StoreType,
  s3AccessKeyId: string,
  s3SecretAccessKey: string,
  s3Bucket: string,
  s3Prefix: string,
}

const DefaultIbisConfig: IbisConfig = {
  enableFts: true,

  storeType: StoreType.None,
  s3AccessKeyId: "",
  s3SecretAccessKey: "",
  s3Bucket: "",
  s3Prefix: ""
};

function saveConfig(cfg: IbisConfig) {
  LsConfig.set(JSON.stringify(cfg));
}

export function loadConfig(): IbisConfig {
  const out: any = {...DefaultIbisConfig}

  const raw = LsConfig.get()
  if (raw !== null) {
    const loaded = JSON.parse(raw)
    if (loaded instanceof Object) {
      for (const [k, v] of Object.entries(loaded)) {
        out[k] = v
      }
    }
  }

  return out
}

// load and save to perform any migrations
saveConfig(loadConfig())

export function Config(props: { onChange: (cfg: IbisConfig) => void }) {
  const [savedCfg, setSavedCfg] = useState(loadConfig)
  const [cfg, updateCfg] = useReducer(
    (old: IbisConfig, action: IbisConfig | [string, any]) => {
      if (action instanceof Array) {
        const [key, value] = action
        if (!(key in old)) throw Error(`key ${key} is not a config value`)
        const copy: IbisConfig = { ...old };
        (copy as any)[key] = value
        return copy
      } else {
        return action
      }
    },
    null,
    loadConfig
  )

  const handleSubmit = () => {
    saveConfig(cfg)
    setSavedCfg(cfg)
    props.onChange(cfg)
  }

  return <form className="Config" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
    <label>
      Enable full text search

      <input
        type="checkbox"
        checked={cfg.enableFts}
        onChange={e => updateCfg(["enableFts", e.target.checked])}
      />
    </label>

    <RadioTabs
      legend="Storage"

      value={cfg.storeType}
      onChange={v => updateCfg(["storeType", v])}

      entries={[
        [StoreType.None, "(ephemeral, for demo)", undefined],
        [StoreType.LocalStorage, "Browser storage", undefined],
        [StoreType.S3, "S3-Compatible", <>
          <label>
            Access Key ID
            <input
              type="text"
              value={cfg.s3AccessKeyId}
              onChange={e => updateCfg(["s3AccessKeyId", e.target.value])}
            />
          </label>

          <label>
            Secret Access Key
            <input
              type="text"
              value={cfg.s3SecretAccessKey}
              onChange={e => updateCfg(["s3SecretAccessKey", e.target.value])}
            />
          </label>

          <label>
            Bucket URL
            <input
              type="text"
              placeholder="https://bucket.s3.us-east-1.amazonaws.com/"
              value={cfg.s3Bucket}
              onChange={e => updateCfg(["s3Bucket", e.target.value])}
            />
          </label>

          <label>
            (optional) Object Prefix
            <input
              type="text"
              value={cfg.s3Prefix}
              onChange={e => updateCfg(["s3Prefix", e.target.value])}
            />
          </label>
        </>],
      ]}
    />

    <div role="group">
      <button type="submit">
        Apply
      </button>
      <button onClick={() => {() => updateCfg(savedCfg)}}>
        Cancel
      </button>
    </div>
  </form>
}

function RadioTabs(props: {
  onChange: (value: string) => any,
  value: string,
  legend?: string,
  entries: [string, string, JSX.Element?][],
}) {
  const radioGroup = useId()

  return <fieldset className="RadioTabs">
    {props.legend && <legend>{props.legend}</legend>}

    {props.entries.map(([key, label, contents]) => <Fragment key={key}>
      <label>
        <input
          type="radio"
          name={radioGroup}
          value={key}

          checked={props.value === key}
          onChange={() => props.onChange(key)}
        />
        {label}
      </label>
      {contents && <fieldset disabled={props.value !== key}>{contents}</fieldset>}
    </Fragment>)}
  </fieldset>
}
