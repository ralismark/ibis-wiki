import {nodeResolve} from "@rollup/plugin-node-resolve"
export default {
  input: "./main.js",
  output: {
    file: "./static/bundle.js",
    format: "iife"
  },
  plugins: [nodeResolve()]
}
