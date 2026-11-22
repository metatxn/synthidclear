# SynthIDClear

Live at [https://synthidclear.com](https://synthidclear.com)

100% browser-based, lossless metadata cleaner for photos and videos (`PNG`, `JPEG`, `WebP`, `HEIC`, `AVIF`, `MP4`, `MOV`). Inspects and removes C2PA Content Credentials, AI creator tags (`DigitalSourceType`), saved PNG prompts (Stable Diffusion / ComfyUI), EXIF, GPS coordinates, IPTC, and QuickTime tags locally in a Web Worker with zero uploads and original color profiles preserved.

> **Scope note:** SynthIDClear removes file-container metadata only. Imperceptible pixel- or signal-level watermarks (such as Google SynthID) live inside the media pixels/audio and are not removed by metadata cleaning.

## Tech Stack

- **Framework:** React 19 + TanStack Start (statically prerendered routes)
- **Styling:** Tailwind CSS v4
- **Processing:** Client-side binary parsers & cleaners in `src/workers/cleaner.worker.ts`
- **Hosting:** Cloudflare Workers Static Assets (`wrangler.jsonc`, zero Worker script invocations) + `public/_headers`
- **Linting & Formatting:** Biome

## Local Development

```bash
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm run check    # Biome lint & format check
pnpm run build    # Production build + static prerender into dist/client
pnpm run preview  # Build and preview locally
pnpm run deploy   # Build and deploy via Wrangler
```

## Architecture Notes

Every route is statically prerendered at build time into `dist/client/` (`prerender: { enabled: true }` in `vite.config.ts`). `wrangler.jsonc` intentionally omits `"main"` so all traffic—including 404s (`public/404.html`), security headers (`public/_headers`), and trailing-slash handling (`drop-trailing-slash`)—is served directly from Cloudflare's Static Assets layer.
