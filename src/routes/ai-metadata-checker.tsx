import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const PATH = "/ai-metadata-checker";

const CHECKER_FAQS: readonly FaqItem[] = [
	{
		question: "What does the AI metadata checker inspect inside a file?",
		answer:
			"It parses binary headers directly in your browser to uncover C2PA / JUMBF Content Credentials, IPTC DigitalSourceType flags, saved Stable Diffusion or ComfyUI prompts, EXIF camera details, GPS coordinates, XMP edit history, QuickTime video atoms, ICC color profiles, and the byte size of each metadata block.",
	},
	{
		question: "Which AI generators can this checker identify from metadata?",
		answer:
			"When a generator writes provenance tags or prompt chunks into the file, SynthIDClear recognizes signatures from ChatGPT / OpenAI, DALL·E, OpenAI Sora, Google Gemini / Imagen, Google Veo, Adobe Firefly, Photoshop Generative Fill, Midjourney, Flux.1, ComfyUI, Stable Diffusion / Automatic1111, Runway, Kling AI, and NovelAI.",
	},
	{
		question:
			"If the checker shows 0 AI tags, does that prove an image is not AI-generated?",
		answer:
			"No. A file with zero metadata can still be AI-generated if the platform stripped headers on export, if it was screenshotted, or if it only carries an invisible pixel watermark like Google SynthID. This tool checks container metadata and provenance records rather than guessing from pixels.",
	},
	{
		question: "Are my files uploaded to a server when I inspect them?",
		answer:
			"No. Every byte is parsed locally in your browser using client-side JavaScript. You can inspect sensitive photos, client deliverables, or private videos completely offline.",
	},
];

const CHECKED_LAYERS = [
	{
		title: "C2PA & Content Credentials",
		body: "Reads JUMBF / C2PA manifests embedded in PNG caBX chunks, JPEG APP11 segments, WebP chunks, HEIC/AVIF UUID boxes, and MP4/MOV containers.",
	},
	{
		title: "IPTC & XMP AI Source Tags",
		body: "Surfaces DigitalSourceType values such as trainedAlgorithmicMedia and compositeWithTrainedAlgorithmicMedia that Instagram and TikTok check.",
	},
	{
		title: "Saved Prompts & Workflows",
		body: "Extracts plain and zlib-compressed PNG text chunks (parameters, prompt, workflow) written by ComfyUI, Automatic1111, Forge, and NovelAI.",
	},
	{
		title: "Privacy, GPS & Footprint Size",
		body: "Flags exact GPS coordinates, camera serial numbers, timestamps, and calculates how many bytes of your file are taken up by hidden metadata.",
	},
] as const;

export const Route = createFileRoute("/ai-metadata-checker")({
	head: () =>
		buildRouteHead({
			title:
				"AI Metadata & C2PA Checker — View Hidden Image & Video Tags | SynthIDClear",
			description:
				"Inspect any PNG, JPEG, WebP, HEIC, AVIF, MP4, or MOV file for C2PA Content Credentials, AI generator tags, prompts, GPS, EXIF, and metadata size locally in your browser.",
			path: PATH,
		}),
	component: AiMetadataCheckerPage,
});

function AiMetadataCheckerPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "All Tools", path: "/tools" },
					{ name: "AI Metadata & C2PA Checker", path: PATH },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — AI Metadata, C2PA & Privacy Checker",
					description:
						"Client-side metadata viewer and C2PA inspector for photos and videos. View AI generator tags, prompts, GPS coordinates, EXIF, and metadata byte size with zero uploads.",
					path: PATH,
				})}
			/>
			<JsonLd data={buildFaqSchema(CHECKER_FAQS)} />

			<section className="space-y-2">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					AI Metadata &amp; C2PA Checker
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					See everything hidden inside a photo or video before you publish or
					share it — C2PA credentials, AI creator tags, saved prompts, GPS
					coordinates, EXIF camera data, and total metadata footprint. Raw
					details open automatically with zero uploads.
				</p>
			</section>

			<CleanerWorkspace
				defaultInspectorOpen
				showSizeBreakdown
				hideScopeBanner
				dropzoneHeading="Drop any photo or video to inspect its metadata"
				dropzoneSubtext="Scans C2PA, XMP, EXIF, GPS, PNG prompts & metadata byte size locally · Nothing is uploaded"
			/>

			<section aria-labelledby="checked-layers-heading" className="space-y-5">
				<div className="space-y-1.5">
					<h2
						id="checked-layers-heading"
						className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
					>
						What this metadata viewer checks
					</h2>
					<p className="m-0 max-w-2xl text-sm text-(--text-secondary)">
						Drop one file or a whole batch to audit privacy leaks, AI provenance
						flags, and metadata overhead — then strip everything (or only AI
						tags) in one click.
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					{CHECKED_LAYERS.map((layer) => (
						<div
							key={layer.title}
							className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4"
						>
							<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
								{layer.title}
							</h3>
							<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
								{layer.body}
							</p>
						</div>
					))}
				</div>
			</section>

			<section
				aria-labelledby="checker-limits-heading"
				className="space-y-3 rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6"
			>
				<h2
					id="checker-limits-heading"
					className="m-0 flex items-center gap-2 text-base font-semibold text-(--text-primary)"
				>
					<Info className="h-4 w-4 text-(--text-muted)" aria-hidden="true" />
					Metadata inspection vs. pixel AI detection
				</h2>
				<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
					This tool inspects deterministic binary records stored in your file
					container (C2PA, XMP, EXIF, IPTC, PNG chunks, QuickTime atoms). It
					does not run probabilistic pixel AI detectors and cannot detect
					invisible pixel watermarks such as Google SynthID, which are embedded
					directly in image or audio samples.
				</p>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
					<Link
						to="/remove-c2pa-metadata"
						className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Remove C2PA Metadata
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to="/ai-only-metadata-remover"
						className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Remove AI Tags Only (Keep EXIF)
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
			</section>

			<FaqAccordion
				heading="Common questions"
				items={CHECKER_FAQS}
				className="mt-0"
			/>
		</div>
	);
}
