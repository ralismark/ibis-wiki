import { GDriveStore } from "./backend/store"
import { IbisConfig, StoreType, loadConfig, saveConfig } from "./config"

// https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow

const CLIENT_ID = "579893209426-r4v305bv08c9ku4ao3hd0314nimdse6b.apps.googleusercontent.com"
const API_KEY = "AIzaSyDSnK4BLcW_qnzcQr92pLuJVZRFP6IAPUY"

const SCOPES = "https://www.googleapis.com/auth/drive"

export function authUrl(email: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", CLIENT_ID)
  url.searchParams.set("redirect_uri", "http://localhost/importer/?google")
  url.searchParams.set("response_type", "token")
  url.searchParams.set("scope", SCOPES)
  url.searchParams.set("include_granted_scopes", "true")
  url.searchParams.set("login_hint", email)
  return url.href
}

export function GoogleDriveStoreConfig(props: { cfg: IbisConfig, updateCfg: (op: [string, any]) => void }) {
  return <>
    <a href={authUrl(props.cfg.gdriveEmail)} role="button">
      Connect to Google Drive
    </a>

    <label>
      Email
      <input
        type="text"
        value={props.cfg.gdriveEmail}
        onChange={e => props.updateCfg(["gdriveEmail", e.target.value])}
      />
    </label>

    <label>
      Access Token
      <input
        type="text"
        value={props.cfg.gdriveAccessToken}
        onChange={e => props.updateCfg(["gdriveAccessToken", e.target.value])}
      />
    </label>

    <label>
      Expires At
      <input
        type="text"
        value={props.cfg.gdriveTokenExpiry}
        readOnly={true}
      />
    </label>
  </>
}

export async function tryImport() {
  if (window.location.search === "?google") {
    const params = new URLSearchParams(location.hash.substring(1))
    console.log(params)

    const access_token = params.get("access_token")
    if (!access_token) throw Error("access_token invalid")

    const expires_in = params.get("expires_in")
    if (!expires_in) throw Error("expires_in invalid")

    let expiry = new Date()
    expiry.setSeconds(expiry.getSeconds() + parseInt(expires_in))

    // check that this works
    const r = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: {
        Authorization: "Bearer " + access_token,
      }
    })
    if (r.status !== 200) throw Error("Request failed: " + r.text())
    const about = await r.json()

    const config = loadConfig()
    config.storeType = StoreType.GoogleDrive
    config.gdriveEmail = about.user.emailAddress
    config.gdriveAccessToken = access_token
    config.gdriveTokenExpiry = expiry.toISOString()
    saveConfig(config)

    location.replace("..")
  }
}
