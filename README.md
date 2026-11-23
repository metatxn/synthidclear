# SynthIDClear

Live at [https://synthidclear.com](https://synthidclear.com)

100% browser-based, lossless metadata cleaner and media privacy toolkit for photos, videos, audio, and PDFs (`PNG`, `JPEG`, `WebP`, `HEIC`, `AVIF`, `MP4`, `MOV`, `MKV`, `WebM`, `MP3`, `WAV`, `FLAC`, `OGG`, `M4A`, `AAC`, `PDF`). Inspects and removes C2PA Content Credentials, AI creator tags (`DigitalSourceType`), saved PNG prompts (Stable Diffusion / ComfyUI), EXIF, GPS coordinates, IPTC, QuickTime/Matroska tags, and ID3/Vorbis/RIFF audio tags locally in-browser with zero uploads and original color profiles preserved.

Powered by `mediabunny` and WebCodecs, SynthIDClear also includes:
- [Visible Icon Remover](https://synthidclear.com/visible-icon-remover) — frame-accurate filmstrip scrubber, repaired playback preview, trim/crop/rotate/mute controls, Web Worker `OffscreenCanvas` export, and direct-to-disk streaming (`StreamTarget`) for MP4, MOV, WebM, and MKV (plus still PNG for images). Targets visible marks only; invisible signals such as Google SynthID are outside its scope.
- [Audio Metadata Remover](https://synthidclear.com/audio-metadata-remover) — lossless ID3, Vorbis, RIFF INFO, and cover-art removal for MP3, WAV, FLAC, OGG, M4A, and AAC.
- [Clean Video Compressor & Converter](https://synthidclear.com/compress-video), [Mute Video & Extract Clean Audio](https://synthidclear.com/mute-extract-audio), and [Clean Video Frame Extractor](https://synthidclear.com/video-frame-extractor) — 100% local media utilities with metadata stripped automatically.

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
