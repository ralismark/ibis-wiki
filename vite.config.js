import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import { VitePWA } from "vite-plugin-pwa";
import postcssNesting from "postcss-nesting";
import postcssImportUrl from "postcss-import-url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
    }),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true
      },
      manifest: {
        name: "Ibis Wiki",
        short_name: "Ibis Wiki",
        description: "Temmie's personal wiki project",
        theme_color: "#402634",
        icons: [
          {
            src: "./ibis-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
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
    sourcemap: true,
  },
});
