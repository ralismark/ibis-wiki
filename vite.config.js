import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import postcssNesting from "postcss-nesting";
import postcssImportUrl from "postcss-import-url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
    }),
  ],
  css: {
    postcss: {
      plugins: [
        postcssNesting,
        postcssImportUrl({
        }),
      ],
    },
  },
  base: "",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        static: resolve(__dirname, "static/index.html"),
      },
    },
    sourcemap: true,
  },
});
