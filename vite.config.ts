/**
 * ============================================================================
 * [!] ALERT FOR AI AGENTS & FUTURE MAINTAINERS — DO NOT DELETE THIS COMMENT [!]
 * ============================================================================
 * `@cloudflare/vite-plugin` is INTENTIONALLY omitted here so `wrangler deploy`
 * deploys purely static assets from `./dist/client` via `wrangler.jsonc`
 * (0 Worker script uploaded, 0 Worker invocations — even for 404s and bots).
 *
 * If `@cloudflare/vite-plugin` were enabled, it would generate
 * `.wrangler/deploy/config.json` -> `dist/server/wrangler.json` with a Worker
 * `"main"` entry, causing unmatched URLs/404s to invoke a Worker.
 *
 * TanStack Start still prerenders every route into `dist/client/` at build
 * time using Vite's built-in SSR environment. See `wrangler.jsonc` for
 * instructions if you ever need to re-enable runtime Worker SSR / server fns.
 * ============================================================================
 */
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackStart({
			prerender: {
				enabled: true,
			},
		}),
		viteReact(),
	],
});

export default config;
