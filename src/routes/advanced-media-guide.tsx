import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CopyCodeBlock } from "#/components/CopyCodeBlock";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import {
	buildArticleSchema,
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
} from "#/lib/seo";

const PATH = "/advanced-media-guide";
const TITLE = "Advanced Video & Audio Operations Guide";
const DESCRIPTION =
	"Step-by-step guide to moving-watermark keyframing, lossless trim/mute vs. re-encoding, direct-to-disk 4K streaming, Streams forensics, and batch FFmpeg workflows.";

const FAQS: readonly FaqItem[] = [
	{
		question:
			"When should I Trim or Crop instead of using the icon repair box?",
		answer:
			"If an AI video has a trailing logo end-card (such as a Veo or Runway outro), use Trim end to cut those seconds off losslessly with zero re-encoding. If a watermark sits right along the top or bottom border, cropping the frame removes it cleanly without blending neighboring pixels.",
	},
	{
		question: "Why does Save directly to disk matter for large 4K videos?",
		answer:
			"Standard browser downloads build the entire output file in memory (ArrayBuffer) before saving. Save directly to disk uses the File System Access API with chunked StreamTarget writes so multi-GB exports write straight to your drive without crashing the browser tab.",
	},
	{
		question: "What does CFR vs. VFR mean in the Streams forensics bar?",
		answer:
			"CFR (Constant Frame Rate) means every frame is evenly spaced (common in cinema or AI renders like 24 fps). VFR (Variable Frame Rate) means frame spacing changes over time (common in smartphone and screen recordings), which explains why exact timestamp stepping matters when placing repair keyframes.",
	},
	{
		question: "Do I still need FFmpeg for MKV or WebM metadata removal?",
		answer:
			"No — SynthIDClear now strips MKV, WebM, MP4, MOV, and audio metadata (MP3, WAV, FLAC, OGG, M4A, AAC) directly in your browser. Offline FFmpeg recipes are only needed if you want to automate folders of hundreds of files or multi-GB archives from the terminal.",
	},
];

export const Route = createFileRoute("/advanced-media-guide")({
	head: () =>
		buildRouteHead({
			title: `${TITLE} — Keyframing, 4K Streaming & Forensics | SynthIDClear`,
			description: DESCRIPTION,
			path: PATH,
		}),
	component: AdvancedMediaGuidePage,
});

function AdvancedMediaGuidePage() {
	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "Guides", path: "/guides" },
					{ name: TITLE, path: PATH },
				])}
			/>
			<JsonLd
				data={buildArticleSchema({
					headline: TITLE,
					description: DESCRIPTION,
					path: PATH,
					datePublished: "2026-11-23",
					dateModified: "2026-11-23",
				})}
			/>
			<JsonLd data={buildFaqSchema(FAQS)} />

			<header className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
				<span className="inline-block text-xs font-semibold tracking-wide text-(--brand-color) uppercase">
					Power-User Playbook
				</span>
				<h1 className="m-0 text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-(--text-primary) sm:text-4xl">
					Advanced Video &amp; Audio Operations Guide
				</h1>
				<p className="mx-auto my-0 max-w-2xl text-base leading-relaxed text-pretty text-(--text-secondary)">
					Get the cleanest results from SynthIDClear&apos;s local WebCodecs and
					Mediabunny tools — from tracking moving corner logos and streaming
					multi-GB 4K exports directly to disk, to reading Streams forensics and
					automating batch folders offline.
				</p>
			</header>

			{/* Section 1: Moving-Watermark Keyframing */}
			<section
				aria-labelledby="keyframing-heading"
				className="space-y-4 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6"
			>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2
						id="keyframing-heading"
						className="m-0 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)"
					>
						1. Tracking a moving watermark with frame-accurate keyframes
					</h2>
					<Link
						to="/visible-icon-remover"
						className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Open Visible Icon Remover
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
				<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
					Generators like Sora move their corner logo across different positions
					during a clip. Instead of drawing one oversized box that blurs half
					the frame, mark tight boxes at the exact timestamps where the mark
					moves:
				</p>
				<ol className="m-0 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-(--text-secondary) marker:font-semibold marker:text-(--text-primary)">
					<li>
						<strong className="text-(--text-primary)">
							Scan the 10-frame filmstrip:
						</strong>{" "}
						Click thumbnails along the timeline to jump straight to where the
						mark shifts corners.
					</li>
					<li>
						<strong className="text-(--text-primary)">
							Pinpoint the jump with <code className="font-mono">-1f</code> /{" "}
							<code className="font-mono">+1f</code>:
						</strong>{" "}
						Step frame-by-frame to the exact last frame before a jump and draw a
						tight box around the icon (including any drop shadow), then step{" "}
						<code className="font-mono">+1f</code> and draw the box in its new
						corner. This prevents the box from sliding slowly across the middle
						of the video.
					</li>
					<li>
						<strong className="text-(--text-primary)">
							Verify with live repaired playback:
						</strong>{" "}
						Switch the preview toggle to{" "}
						<strong className="text-(--text-primary)">Edited</strong> and click{" "}
						<strong className="text-(--text-primary)">Preview repaired</strong>{" "}
						to watch the full clip play in real time with synced audio before
						starting a full encode.
					</li>
					<li>
						<strong className="text-(--text-primary)">
							Check metadata privacy in Video options:
						</strong>{" "}
						<em>Strip hidden metadata &amp; creation date on export</em> is
						enabled by default so exported clips never copy container AI tags or
						stamp a fresh creation date.
					</li>
				</ol>
			</section>

			{/* Section 2: Lossless vs Re-encode Decision Table */}
			<section
				aria-labelledby="decision-heading"
				className="space-y-4 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6"
			>
				<h2
					id="decision-heading"
					className="m-0 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)"
				>
					2. Choosing the right operation: Lossless copy vs. WebCodecs re-encode
				</h2>
				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-left text-sm">
						<caption className="visually-hidden">
							Comparison of SynthIDClear media operations, whether they
							re-encode pixels, and which tool to use
						</caption>
						<thead>
							<tr className="border-b border-(--border-color) text-xs font-semibold text-(--text-muted) uppercase">
								<th scope="col" className="py-3 pr-4">
									Goal
								</th>
								<th scope="col" className="px-4 py-3">
									Mode
								</th>
								<th scope="col" className="px-4 py-3">
									Quality Impact
								</th>
								<th scope="col" className="py-3 pl-4">
									Tool
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-(--border-color) text-(--text-secondary)">
							<tr>
								<th
									scope="row"
									className="py-3 pr-4 font-medium text-(--text-primary)"
								>
									Remove MP4, MOV, MKV, or WebM tags
								</th>
								<td className="px-4 py-3">Lossless remux / slice</td>
								<td className="px-4 py-3">0% loss (bit-exact streams)</td>
								<td className="py-3 pl-4">
									<Link
										to="/video-metadata-remover"
										className="font-semibold text-(--brand-color) no-underline hover:underline"
									>
										Video Metadata Remover
									</Link>
								</td>
							</tr>
							<tr>
								<th
									scope="row"
									className="py-3 pr-4 font-medium text-(--text-primary)"
								>
									Remove MP3, WAV, FLAC, OGG, M4A, AAC tags
								</th>
								<td className="px-4 py-3">Lossless packet copy</td>
								<td className="px-4 py-3">0% loss (bit-exact audio)</td>
								<td className="py-3 pl-4">
									<Link
										to="/audio-metadata-remover"
										className="font-semibold text-(--brand-color) no-underline hover:underline"
									>
										Audio Metadata Remover
									</Link>
								</td>
							</tr>
							<tr>
								<th
									scope="row"
									className="py-3 pr-4 font-medium text-(--text-primary)"
								>
									Strip background voices or extract audio
								</th>
								<td className="px-4 py-3">Lossless track discard</td>
								<td className="px-4 py-3">0% loss (instant)</td>
								<td className="py-3 pl-4">
									<Link
										to="/mute-extract-audio"
										className="font-semibold text-(--brand-color) no-underline hover:underline"
									>
										Mute &amp; Extract Audio
									</Link>
								</td>
							</tr>
							<tr>
								<th
									scope="row"
									className="py-3 pr-4 font-medium text-(--text-primary)"
								>
									Cut a trailing outro card without inpainting
								</th>
								<td className="px-4 py-3">Trim-only (lossless preferred)</td>
								<td className="px-4 py-3">0% loss on keyframe cuts</td>
								<td className="py-3 pl-4">
									<Link
										to="/visible-icon-remover"
										className="font-semibold text-(--brand-color) no-underline hover:underline"
									>
										Visible Icon Remover
									</Link>
								</td>
							</tr>
							<tr>
								<th
									scope="row"
									className="py-3 pr-4 font-medium text-(--text-primary)"
								>
									Repair visible icon, crop, or bake rotation
								</th>
								<td className="px-4 py-3">Web Worker WebCodecs</td>
								<td className="px-4 py-3">Source bitrate + 10% headroom</td>
								<td className="py-3 pl-4">
									<Link
										to="/visible-icon-remover"
										className="font-semibold text-(--brand-color) no-underline hover:underline"
									>
										Visible Icon Remover
									</Link>
								</td>
							</tr>
							<tr>
								<th
									scope="row"
									className="py-3 pr-4 font-medium text-(--text-primary)"
								>
									Shrink MOV/MKV/4K for Discord, X, or web
								</th>
								<td className="px-4 py-3">WebCodecs + Fast-Start MP4</td>
								<td className="px-4 py-3">Configurable preset + cap</td>
								<td className="py-3 pl-4">
									<Link
										to="/compress-video"
										className="font-semibold text-(--brand-color) no-underline hover:underline"
									>
										Clean Video Compressor
									</Link>
								</td>
							</tr>
							<tr>
								<th
									scope="row"
									className="py-3 pr-4 font-medium text-(--text-primary)"
								>
									Grab clean thumbnails or 10-frame still packs
								</th>
								<td className="px-4 py-3">CanvasSink frame decode</td>
								<td className="px-4 py-3">Full-res PNG / JPG / WebP</td>
								<td className="py-3 pl-4">
									<Link
										to="/video-frame-extractor"
										className="font-semibold text-(--brand-color) no-underline hover:underline"
									>
										Video Frame Extractor
									</Link>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			{/* Section 3: 4K Direct-to-Disk & Streams Forensics */}
			<section className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-3 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-lg font-semibold text-(--text-primary)">
						3. Exporting large 4K clips without RAM crashes
					</h2>
					<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
						Browser tabs have strict in-memory limits. When editing or
						compressing long 1080p/4K videos on Chrome or Edge, click{" "}
						<strong className="text-(--text-primary)">
							Save directly to disk
						</strong>{" "}
						in{" "}
						<Link
							to="/visible-icon-remover"
							className="font-medium text-(--brand-color) no-underline hover:underline"
						>
							Visible Icon Remover
						</Link>{" "}
						or{" "}
						<Link
							to="/compress-video"
							className="font-medium text-(--brand-color) no-underline hover:underline"
						>
							Clean Video Compressor
						</Link>
						.
					</p>
					<ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-(--text-secondary)">
						<li>
							Uses <code className="font-mono text-xs">StreamTarget</code>{" "}
							chunked streaming into a native file handle so encoded bytes flush
							to disk continuously.
						</li>
						<li>
							All pixel inpainting runs inside a dedicated Web Worker with{" "}
							<code className="font-mono text-xs">OffscreenCanvas</code> so the
							interface stays responsive and cancelable.
						</li>
						<li>
							On Safari or Firefox (where{" "}
							<code className="font-mono text-xs">showSaveFilePicker</code> is
							unavailable), SynthIDClear automatically falls back to standard
							in-memory Blob downloads.
						</li>
					</ul>
				</div>

				<div className="flex flex-col gap-3 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-lg font-semibold text-(--text-primary)">
						4. Reading the Streams forensics bar
					</h2>
					<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
						Even when descriptive tags look empty, stream headers can still
						reveal how a file was recorded or edited:
					</p>
					<ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-(--text-secondary)">
						<li>
							<strong className="text-(--text-primary)">Track names:</strong>{" "}
							Editors and mobile apps often stamp handler names like{" "}
							<code className="font-mono text-xs">Core Media Video</code>,{" "}
							<code className="font-mono text-xs">CapCut</code>, or{" "}
							<code className="font-mono text-xs">Lavf</code> on individual
							tracks — highlighted in red when detected.
						</li>
						<li>
							<strong className="text-(--text-primary)">CFR vs. VFR:</strong>{" "}
							Constant frame rate (
							<code className="font-mono text-xs">CFR</code>) vs. variable frame
							rate (<code className="font-mono text-xs">VFR</code>) derived
							directly from packet timestamps rather than untrustworthy header
							estimates.
						</li>
						<li>
							<strong className="text-(--text-primary)">
								HDR, Color Space &amp; Rotation:
							</strong>{" "}
							Flags 10-bit HDR (
							<code className="font-mono text-xs">bt2020</code>) and container
							rotation flags (such as iPhone{" "}
							<code className="font-mono text-xs">Rotated 90°</code>). Baking
							rotation in Visible Icon Remover removes the rotation flag
							cleanly.
						</li>
					</ul>
				</div>
			</section>

			{/* Section 5: Offline Batch CLI Recipes */}
			<section
				aria-labelledby="cli-heading"
				className="space-y-5 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6"
			>
				<div className="space-y-1">
					<h2
						id="cli-heading"
						className="m-0 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)"
					>
						5. Power-user offline batch recipes (FFmpeg &amp; ffprobe)
					</h2>
					<p className="m-0 text-sm text-(--text-secondary)">
						For automated folders of hundreds of files or multi-gigabyte studio
						exports, run these zero-upload commands locally in your terminal:
					</p>
				</div>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							Batch-clean a folder of MP4, MOV, MKV &amp; WebM videos (lossless)
						</h3>
						<CopyCodeBlock
							label="macOS / Linux · Batch lossless video clean"
							code={`mkdir -p clean && for f in *.mp4 *.mov *.mkv *.webm; do [ -e "$f" ] || continue; ffmpeg -y -i "$f" -map 0:v -map 0:a? -map_metadata -1 -map_chapters -1 -fflags +bitexact -c copy "clean/$f"; done`}
							ariaLabel="Copy batch lossless video metadata cleaning command"
						/>
					</div>

					<div className="space-y-1.5">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							Batch-clean a folder of MP3, FLAC, WAV &amp; M4A audio files
							(strips tags &amp; cover art)
						</h3>
						<CopyCodeBlock
							label="macOS / Linux · Batch lossless audio clean"
							code={`mkdir -p clean_audio && for f in *.mp3 *.flac *.wav *.ogg *.m4a; do [ -e "$f" ] || continue; ffmpeg -y -i "$f" -map 0:a -map_metadata -1 -c:a copy "clean_audio/$f"; done`}
							ariaLabel="Copy batch lossless audio metadata cleaning command"
						/>
					</div>

					<div className="space-y-1.5">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							Audit every container tag, chapter, and stream header with ffprobe
						</h3>
						<CopyCodeBlock
							label="FFprobe · Full container & stream audit"
							code={`ffprobe -v quiet -print_format json -show_format -show_streams -show_chapters input.mp4`}
							ariaLabel="Copy ffprobe full audit command"
						/>
					</div>
				</div>
			</section>

			<FaqAccordion heading="Common questions" items={FAQS} />
		</div>
	);
}
