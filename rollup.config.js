import {nodeResolve} from "@rollup/plugin-node-resolve"
import {lezer} from "lezer-generator/rollup"

export default {
  input: "./main.js",
  output: {
    file: "./static/bundle.js",
    format: "iife"
  },
  plugins: [lezer(), nodeResolve()]
}
