import * as api from "./api.mjs";
import $ from "./dollar.mjs";
import {DP} from "./fs.mjs";
import * as dom from "./dom.mjs";

window.api = api;
window.$ = $;
window.DP = DP;

for(let key of Object.keys(dom)) window[key] = dom[key];
