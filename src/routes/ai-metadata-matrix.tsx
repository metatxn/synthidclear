import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import {
	buildArticleSchema,
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
} from "#/lib/seo";

const PATH = "/ai-metadata-matrix";
const PUBLISHED_DATE = "2026-11-23";

type MatrixFilter = "all" | "image" | "video" | "c2pa" | "prompts" | "synthid";

type SignalLevel = "yes" | "partial" | "no";

interface MatrixRow {
	id: string;
	generator: string;
	mediaType: "image" | "video" | "hybrid";
	formats: string;
	c2pa: { level: SignalLevel; detail: string };
	iptc: { level: SignalLevel; detail: string };
	prompts: { level: SignalLevel; detail: string };
	watermark: { hasSynthId: boolean; detail: string };
	removable: string;
	guideTo:
		| "/chatgpt-image-metadata"
		| "/sora-video-metadata"
		| "/gemini-image-metadata"
		| "/veo-video-metadata"
		| "/photoshop-ai-metadata"
		| "/ai-only-metadata-remover"
		| "/midjourney-metadata"
		| "/png-prompt-remover"
		| "/video-metadata-remover"
		| "/heic-metadata-remover";
	guideLabel: string;
}

const MATRIX_ROWS: readonly MatrixRow[] = [
	{
		id: "chatgpt",
		generator: "ChatGPT / DALL·E (OpenAI)",
		mediaType: "image",
		formats: "PNG, WebP, JPEG",
		c2pa: { level: "yes", detail: "Signed C2PA (caBX / APP11)" },
		iptc: { level: "yes", detail: "trainedAlgorithmicMedia" },
		prompts: { level: "no", detail: "None" },
		watermark: {
			hasSynthId: false,
			detail: "No visible mark; OpenAI keeps internal reverse-search",
		},
		removable: "Removes C2PA & XMP losslessly",
		guideTo: "/chatgpt-image-metadata",
		guideLabel: "ChatGPT guide",
	},
	{
		id: "sora",
		generator: "OpenAI Sora",
		mediaType: "video",
		formats: "MP4",
		c2pa: { level: "yes", detail: "MP4 C2PA UUID box" },
		iptc: { level: "yes", detail: "AI generator box" },
		prompts: { level: "no", detail: "None" },
		watermark: {
			hasSynthId: false,
			detail: "Moving visible Sora logo in frames + internal search",
		},
		removable: "Removes C2PA & MP4 tags (visible logo stays)",
		guideTo: "/sora-video-metadata",
		guideLabel: "Sora guide",
	},
	{
		id: "gemini",
		generator: "Google Gemini / Imagen",
		mediaType: "image",
		formats: "PNG, JPEG, WebP",
		c2pa: { level: "partial", detail: "Added on supported Google surfaces" },
		iptc: {
			level: "yes",
			detail: "trainedAlgorithmicMedia + Google AI credit",
		},
		prompts: { level: "no", detail: "None" },
		watermark: {
			hasSynthId: true,
			detail: "Google SynthID (pixel watermark) + corner sparkle on free tiers",
		},
		removable: "Removes IPTC/XMP/C2PA (SynthID & sparkle stay)",
		guideTo: "/gemini-image-metadata",
		guideLabel: "Gemini guide",
	},
	{
		id: "veo",
		generator: "Google Veo",
		mediaType: "video",
		formats: "MP4",
		c2pa: { level: "partial", detail: "Surface-dependent C2PA box" },
		iptc: { level: "partial", detail: "MP4 container & encoder tags" },
		prompts: { level: "no", detail: "None" },
		watermark: {
			hasSynthId: true,
			detail:
				"Google SynthID (video frames + audio) + visible mark on some tiers",
		},
		removable: "Removes MP4 tags/C2PA (SynthID & visible mark stay)",
		guideTo: "/veo-video-metadata",
		guideLabel: "Veo guide",
	},
	{
		id: "firefly",
		generator: "Adobe Firefly",
		mediaType: "image",
		formats: "JPEG, PNG, WebP",
		c2pa: { level: "yes", detail: "Signed Adobe Content Credentials" },
		iptc: { level: "yes", detail: "trainedAlgorithmicMedia" },
		prompts: { level: "no", detail: "None" },
		watermark: { hasSynthId: false, detail: "No pixel or visible watermark" },
		removable: "Removes C2PA & IPTC/XMP losslessly",
		guideTo: "/photoshop-ai-metadata",
		guideLabel: "Firefly guide",
	},
	{
		id: "photoshop",
		generator: "Photoshop Generative Fill / Remove Tool",
		mediaType: "image",
		formats: "JPEG, PNG, HEIC, WebP",
		c2pa: { level: "yes", detail: "When Content Credentials enabled" },
		iptc: {
			level: "yes",
			detail: "compositeWithTrainedAlgorithmicMedia",
		},
		prompts: { level: "no", detail: "None" },
		watermark: { hasSynthId: false, detail: "None" },
		removable: "AI-only mode removes C2PA/AI tags while keeping camera EXIF",
		guideTo: "/ai-only-metadata-remover",
		guideLabel: "AI-only cleaner",
	},
	{
		id: "midjourney",
		generator: "Midjourney",
		mediaType: "image",
		formats: "PNG, WebP, JPEG",
		c2pa: { level: "no", detail: "Not embedded by default" },
		iptc: { level: "yes", detail: "trainedAlgorithmicMedia" },
		prompts: {
			level: "yes",
			detail: "Description (prompt), Author & Job ID chunks",
		},
		watermark: { hasSynthId: false, detail: "None" },
		removable: "Removes prompt chunks, Job ID & IPTC tags losslessly",
		guideTo: "/midjourney-metadata",
		guideLabel: "Midjourney guide",
	},
	{
		id: "comfyui",
		generator: "ComfyUI",
		mediaType: "image",
		formats: "PNG, WebP",
		c2pa: { level: "no", detail: "Only via custom nodes" },
		iptc: { level: "no", detail: "None by default" },
		prompts: {
			level: "yes",
			detail: "Full JSON prompt & node workflow graph (tEXt / iTXt)",
		},
		watermark: { hasSynthId: false, detail: "None" },
		removable: "Removes prompt & workflow JSON chunks losslessly",
		guideTo: "/png-prompt-remover",
		guideLabel: "PNG remover",
	},
	{
		id: "sd-a1111",
		generator: "Stable Diffusion (Automatic1111 / Forge)",
		mediaType: "image",
		formats: "PNG, JPEG, WebP",
		c2pa: { level: "no", detail: "None" },
		iptc: { level: "no", detail: "None" },
		prompts: {
			level: "yes",
			detail:
				"parameters chunk (prompt, negative prompt, seed, CFG, model hash)",
		},
		watermark: {
			hasSynthId: false,
			detail: "Optional invisible-watermark extension if enabled",
		},
		removable: "Removes parameters chunks, EXIF & XMP losslessly",
		guideTo: "/png-prompt-remover",
		guideLabel: "PNG remover",
	},
	{
		id: "flux",
		generator: "Flux.1 (Black Forest Labs / Hosted)",
		mediaType: "image",
		formats: "PNG, JPEG, WebP",
		c2pa: { level: "partial", detail: "Varies by hosted API / partner" },
		iptc: { level: "partial", detail: "Varies by hosted platform" },
		prompts: {
			level: "partial",
			detail: "Saved when generated via ComfyUI or Forge",
		},
		watermark: { hasSynthId: false, detail: "None in open-weight releases" },
		removable: "Removes prompts, C2PA & XMP losslessly",
		guideTo: "/png-prompt-remover",
		guideLabel: "PNG remover",
	},
	{
		id: "runway-kling",
		generator: "Runway / Kling AI",
		mediaType: "video",
		formats: "MP4",
		c2pa: { level: "partial", detail: "Partial / evolving by export tier" },
		iptc: { level: "partial", detail: "Encoder & creator MP4 atoms" },
		prompts: { level: "no", detail: "None" },
		watermark: {
			hasSynthId: false,
			detail: "Visible corner watermark on free tiers",
		},
		removable: "Removes MP4 metadata & encoder tags (visible mark stays)",
		guideTo: "/video-metadata-remover",
		guideLabel: "Video remover",
	},
	{
		id: "iphone-camera",
		generator: "iPhone & Digital Cameras (Baseline)",
		mediaType: "hybrid",
		formats: "HEIC, JPEG, MOV",
		c2pa: { level: "no", detail: "Only select C2PA hardware cameras" },
		iptc: {
			level: "partial",
			detail: "Only if edited with AI tools (Apple Clean Up / Photoshop)",
		},
		prompts: { level: "no", detail: "None" },
		watermark: {
			hasSynthId: false,
			detail: "No watermark — embeds exact GPS, camera model & timestamps",
		},
		removable: "Removes GPS, EXIF & XMP losslessly while keeping Display P3",
		guideTo: "/heic-metadata-remover",
		guideLabel: "HEIC remover",
	},
];

const SOCIAL_PLATFORMS = [
	{
		platform: "Instagram & Facebook (Meta)",
		label: "“AI info” label",
		reads:
			"C2PA Content Credentials, IPTC DigitalSourceType (trainedAlgorithmicMedia & compositeWithTrainedAlgorithmicMedia), invisible signals, and creator disclosure toggle.",
		to: "/instagram-ai-label" as const,
	},
	{
		platform: "TikTok",
		label: "“AI-generated” badge",
		reads:
			"C2PA Content Credentials in MP4/MOV videos and photos (first major video platform to auto-label via C2PA), plus creator disclosure and internal classifiers.",
		to: "/tiktok-ai-label" as const,
	},
	{
		platform: "YouTube",
		label: "Altered or synthetic content disclosure",
		reads:
			"Creator Studio disclosure checkbox plus Google SynthID / C2PA provenance signals on supported uploads (including Google Veo clips).",
		to: "/veo-video-metadata" as const,
	},
] as const;

const MATRIX_FAQS: readonly FaqItem[] = [
	{
		question:
			"Which AI image generators embed C2PA Content Credentials in 2026?",
		answer:
			"OpenAI (ChatGPT images, DALL·E, and Sora), Adobe (Firefly and Photoshop Generative Fill when Content Credentials are enabled), and supported Google Gemini / Imagen surfaces embed signed C2PA manifests. Midjourney and local Stable Diffusion / ComfyUI installs generally do not embed C2PA by default, relying instead on IPTC tags or PNG text chunks.",
	},
	{
		question:
			"What is the difference between C2PA metadata and Google SynthID?",
		answer:
			"C2PA is a container-level metadata block stored in the file header (such as a PNG caBX chunk, JPEG APP11 segment, or MP4 UUID box) that can be inspected and removed losslessly. Google SynthID is a pixel-level or audio-waveform watermark baked directly into the media signal itself, so stripping metadata headers does not remove SynthID.",
	},
	{
		question:
			"Which AI tools silently save my full prompt inside the image file?",
		answer:
			"ComfyUI (JSON prompt and full workflow node graph), Stable Diffusion WebUI / Automatic1111 / Forge (parameters text chunk with prompt, negative prompt, seed, CFG, and checkpoint hash), NovelAI, and Midjourney PNG downloads (Description, Author, and Job ID) commonly embed prompts inside PNG text chunks.",
	},
	{
		question: "How can I check which metadata layer my own file actually has?",
		answer:
			"Drop your PNG, JPEG, WebP, HEIC, AVIF, MP4, MOV, or PDF into SynthIDClear's AI Metadata & C2PA Checker. It inspects every container block locally inside your browser with zero uploads and shows exact C2PA, IPTC, prompt, EXIF, GPS, and metadata byte sizes.",
	},
	{
		question:
			"Can a real camera photo get tagged as AI-generated on Instagram?",
		answer:
			"Yes. If you retouch a real photograph using Photoshop Generative Fill, Adobe Firefly, or certain phone AI erasers, the editor can write C2PA credentials and IPTC DigitalSourceType = compositeWithTrainedAlgorithmicMedia. Using SynthIDClear's AI-Only Metadata Remover strips those AI tags while keeping your original camera EXIF and copyright intact.",
	},
];

const FILTERS: ReadonlyArray<{ id: MatrixFilter; label: string }> = [
	{ id: "all", label: "All (12)" },
	{ id: "image", label: "Image Generators" },
	{ id: "video", label: "Video Generators" },
	{ id: "c2pa", label: "Has C2PA" },
	{ id: "prompts", label: "Saves Prompts" },
	{ id: "synthid", label: "Uses SynthID" },
];

function SignalBadge({
	level,
	detail,
}: {
	level: SignalLevel;
	detail: string;
}) {
	const styles =
		level === "yes"
			? "border-(--brand-color)/30 bg-(--brand-color)/10 text-(--brand-color)"
			: level === "partial"
				? "border-(--warning-color)/30 bg-(--warning-color)/10 text-(--warning-color)"
				: "border-(--border-color) bg-(--bg-surface) text-(--text-muted)";
	const label =
		level === "yes" ? "Yes" : level === "partial" ? "Partial" : "No";

	return (
		<div className="space-y-1">
			<span
				className={`inline-block rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${styles}`}
			>
				{label}
			</span>
			<span className="block text-xs leading-snug text-(--text-secondary)">
				{detail}
			</span>
		</div>
	);
}

export const Route = createFileRoute("/ai-metadata-matrix")({
	head: () =>
		buildRouteHead({
			title: "AI Metadata Matrix (2026): C2PA & SynthID | SynthIDClear",
			description:
				"Compare which AI image & video generators embed C2PA, IPTC AI tags, prompts, or SynthID in 2026 — and what metadata cleaning removes vs. leaves intact.",
			path: PATH,
		}),
	component: AiMetadataMatrixPage,
});

function AiMetadataMatrixPage() {
	const [filter, setFilter] = useState<MatrixFilter>("all");

	const visibleRows = MATRIX_ROWS.filter((row) => {
		if (filter === "all") return true;
		if (filter === "image") return row.mediaType === "image";
		if (filter === "video") return row.mediaType === "video";
		if (filter === "c2pa") return row.c2pa.level !== "no";
		if (filter === "prompts") return row.prompts.level !== "no";
		if (filter === "synthid") return row.watermark.hasSynthId;
		return true;
	});

	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "Guides", path: "/guides" },
					{ name: "2026 AI Metadata Matrix", path: PATH },
				])}
			/>
			<JsonLd
				data={buildArticleSchema({
					headline:
						"2026 AI Metadata Matrix: Which Generators Embed C2PA, Prompts, or SynthID",
					description:
						"Side-by-side technical reference comparing C2PA Content Credentials, IPTC DigitalSourceType tags, saved PNG prompts, and invisible pixel/audio watermarks across major AI image and video generators.",
					path: PATH,
					datePublished: PUBLISHED_DATE,
					dateModified: PUBLISHED_DATE,
				})}
			/>
			<JsonLd data={buildFaqSchema(MATRIX_FAQS)} />

			<section className="space-y-4">
				<div className="inline-flex items-center gap-2 rounded-full border border-(--border-color) bg-(--bg-surface) px-3 py-1 text-xs font-medium text-(--text-secondary)">
					<span>Technical Reference · Updated November 2026</span>
				</div>
				<h1 className="m-0 text-3xl leading-tight font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					2026 AI Metadata Matrix: C2PA, Prompts &amp; SynthID by Generator
				</h1>
				<p className="m-0 max-w-3xl text-base leading-relaxed text-(--text-secondary)">
					A practical reference comparing what hidden provenance metadata — and
					what pixel or frame watermarks — major AI image and video tools write
					into exported files, plus what lossless metadata cleaning can and
					cannot remove.
				</p>
			</section>

			{/* 3-Layer TL;DR Box */}
			<section
				aria-labelledby="three-layers-heading"
				className="grid gap-3 md:grid-cols-3"
			>
				<h2 id="three-layers-heading" className="visually-hidden">
					Three AI provenance layers
				</h2>
				<div className="space-y-1.5 rounded-2xl border border-(--border-color) bg-(--bg-card) p-4">
					<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--success-color)">
						<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
						Layer 1 · Removable losslessly
					</span>
					<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
						Container Metadata (C2PA, IPTC, Prompts)
					</h3>
					<p className="m-0 text-xs leading-relaxed text-(--text-secondary)">
						Stored in file headers (PNG <code className="font-mono">caBX</code>/
						<code className="font-mono">tEXt</code>, JPEG{" "}
						<code className="font-mono">APP1</code>/
						<code className="font-mono">APP11</code>, HEIC/MP4 boxes). Removable
						with zero pixel loss.
					</p>
				</div>

				<div className="space-y-1.5 rounded-2xl border border-(--border-color) bg-(--bg-card) p-4">
					<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--warning-color)">
						<ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
						Layer 2 · Survives metadata cleaning
					</span>
					<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
						Invisible Pixel / Audio Watermarks (SynthID)
					</h3>
					<p className="m-0 text-xs leading-relaxed text-(--text-secondary)">
						Imperceptible signals embedded inside pixels or audio waveforms
						(Google Gemini, Imagen, Veo). Metadata stripping never alters these.
					</p>
				</div>

				<div className="space-y-1.5 rounded-2xl border border-(--border-color) bg-(--bg-card) p-4">
					<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--text-muted)">
						<Info className="h-3.5 w-3.5" aria-hidden="true" />
						Layer 3 · Rendered into pixels
					</span>
					<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
						Visible Frame Overlays (Logos &amp; Sparkles)
					</h3>
					<p className="m-0 text-xs leading-relaxed text-(--text-secondary)">
						Visible marks drawn into frames (Sora moving logo, Gemini sparkle,
						free-tier video logos). Not metadata and untouched by metadata
						cleaners.
					</p>
				</div>
			</section>

			{/* Interactive Matrix Table */}
			<section aria-labelledby="matrix-table-heading" className="space-y-4">
				<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
					<div className="space-y-1">
						<h2
							id="matrix-table-heading"
							className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
						>
							Generator-by-generator breakdown
						</h2>
						<p className="m-0 text-sm text-(--text-secondary)">
							Filter by media type or provenance layer, or jump to the guide for
							any tool.
						</p>
					</div>

					<fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
						<legend className="visually-hidden">Filter matrix rows</legend>
						{FILTERS.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => setFilter(item.id)}
								aria-pressed={filter === item.id}
								className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
									filter === item.id
										? "border-(--text-primary) bg-(--text-primary) text-(--bg-canvas)"
										: "border-(--border-color) bg-(--bg-card) text-(--text-secondary) hover:border-(--text-primary) hover:text-(--text-primary)"
								}`}
							>
								{item.label}
							</button>
						))}
					</fieldset>
				</div>

				<div className="overflow-x-auto rounded-2xl border border-(--border-color) bg-(--bg-card)">
					<table className="w-full min-w-[820px] border-collapse text-left text-sm">
						<thead>
							<tr className="border-b border-(--border-color) bg-(--bg-surface) text-xs font-semibold tracking-wide text-(--text-secondary) uppercase">
								<th scope="col" className="px-4 py-3">
									Generator &amp; Formats
								</th>
								<th scope="col" className="px-4 py-3">
									C2PA
								</th>
								<th scope="col" className="px-4 py-3">
									IPTC / XMP Tag
								</th>
								<th scope="col" className="px-4 py-3">
									Saved Prompts
								</th>
								<th scope="col" className="px-4 py-3">
									Pixel / Visible Watermark
								</th>
								<th scope="col" className="px-4 py-3">
									What Cleaning Removes
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-(--border-color)">
							{visibleRows.map((row) => (
								<tr key={row.id} className="align-top">
									<th
										scope="row"
										className="px-4 py-3.5 font-semibold text-(--text-primary)"
									>
										<div className="space-y-1">
											<span className="block text-sm font-semibold">
												{row.generator}
											</span>
											<span className="block font-mono text-[11px] font-normal text-(--text-muted)">
												{row.formats}
											</span>
											<Link
												to={row.guideTo}
												className="inline-flex items-center gap-1 pt-0.5 text-xs font-medium text-(--brand-color) no-underline hover:underline"
											>
												{row.guideLabel}
												<ArrowRight className="h-3 w-3" aria-hidden="true" />
											</Link>
										</div>
									</th>
									<td className="px-4 py-3.5">
										<SignalBadge
											level={row.c2pa.level}
											detail={row.c2pa.detail}
										/>
									</td>
									<td className="px-4 py-3.5">
										<SignalBadge
											level={row.iptc.level}
											detail={row.iptc.detail}
										/>
									</td>
									<td className="px-4 py-3.5">
										<SignalBadge
											level={row.prompts.level}
											detail={row.prompts.detail}
										/>
									</td>
									<td className="px-4 py-3.5 text-xs leading-snug text-(--text-secondary)">
										{row.watermark.hasSynthId && (
											<span className="mb-1 inline-block rounded-md border border-(--warning-color)/30 bg-(--warning-color)/10 px-1.5 py-0.5 text-[11px] font-semibold text-(--warning-color)">
												SynthID
											</span>
										)}
										<span className="block">{row.watermark.detail}</span>
									</td>
									<td className="px-4 py-3.5 text-xs leading-snug text-(--text-primary)">
										{row.removable}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			{/* How Social Platforms Use These Signals */}
			<section aria-labelledby="social-reads-heading" className="space-y-4">
				<div className="space-y-1">
					<h2
						id="social-reads-heading"
						className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
					>
						How social platforms read these signals
					</h2>
					<p className="m-0 text-sm text-(--text-secondary)">
						Automatic AI badges are primarily triggered by C2PA Content
						Credentials and IPTC{" "}
						<code className="font-mono text-xs">DigitalSourceType</code>{" "}
						headers, supplemented by invisible watermarks and user disclosures.
					</p>
				</div>
				<div className="grid gap-3 md:grid-cols-3">
					{SOCIAL_PLATFORMS.map((item) => (
						<Link
							key={item.platform}
							to={item.to}
							className="group flex flex-col justify-between gap-3 rounded-xl border border-(--border-color) bg-(--bg-card) p-4 text-(--text-primary) no-underline hover:border-(--text-primary)"
						>
							<div className="space-y-1.5">
								<span className="block text-sm font-semibold group-hover:text-(--brand-color)">
									{item.platform}
								</span>
								<span className="inline-block rounded-md bg-(--bg-surface) px-2 py-0.5 text-[11px] font-medium text-(--text-secondary)">
									{item.label}
								</span>
								<p className="m-0 pt-1 text-xs leading-relaxed text-(--text-secondary)">
									{item.reads}
								</p>
							</div>
							<span className="inline-flex items-center gap-1 text-xs font-semibold text-(--brand-color)">
								Read platform guide
								<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
							</span>
						</Link>
					))}
				</div>
			</section>

			{/* CTA Banner */}
			<section
				aria-label="Inspect your own file"
				className="flex flex-col justify-between gap-4 rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6 sm:flex-row sm:items-center"
			>
				<div className="max-w-2xl space-y-1.5">
					<h2 className="m-0 text-lg font-semibold text-(--text-primary)">
						Verify your own file locally in seconds
					</h2>
					<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
						Drop any PNG, JPEG, WebP, HEIC, AVIF, MP4, MOV, or PDF into our
						browser-based inspector to view exact C2PA manifests, IPTC tags,
						prompts, GPS, and metadata byte overhead — zero uploads.
					</p>
				</div>
				<div className="flex flex-wrap gap-2.5">
					<Link
						to="/ai-metadata-checker"
						className="touch-target inline-flex shrink-0 items-center gap-2 rounded-xl bg-(--brand-color) px-4 py-2.5 text-sm font-semibold text-(--brand-text) no-underline hover:bg-(--brand-hover)"
					>
						Open Metadata Checker
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to="/tools"
						className="touch-target inline-flex shrink-0 items-center gap-2 rounded-xl border border-(--border-color) bg-(--bg-card) px-4 py-2.5 text-sm font-semibold text-(--text-primary) no-underline hover:border-(--text-primary)"
					>
						All Free Tools
					</Link>
				</div>
			</section>

			<FaqAccordion
				heading="Common questions"
				items={MATRIX_FAQS}
				className="mt-0"
			/>
		</div>
	);
}
