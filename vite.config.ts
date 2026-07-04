import react from "@vitejs/plugin-react"
import postcssNesting from "postcss-nesting"
import { defineConfig } from "vite"
import checker from "vite-plugin-checker"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
	server: {
		port: 80,
	},

	plugins: [
		react(),
		checker({
			// e.g. use TypeScript check
			typescript: true,
		}),
		VitePWA({
			manifest: {
				name: "Ibis Wiki",
				short_name: "Ibis Wiki",
				description: "Temmie's personal wiki project",
				theme_color: "#402634",
				icons: [
					{
						src: "public/ibis-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
				],
			},
		}),
	],

	css: {
		postcss: {
			plugins: [postcssNesting],
		},
	},

	build: {
		sourcemap: true,
	},
})
