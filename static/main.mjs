import * as api from "./api.mjs";
import $ from "./dollar.mjs";
import {DP} from "./fs.mjs";
import * as dom from "./dom.mjs";
import Config from "./config.mjs";

window.api = api;
window.$ = $;
window.DP = DP;
window.Config = Config;

for(let key of Object.keys(dom)) window[key] = dom[key];

import(Config.GET_URL + "init.js");
