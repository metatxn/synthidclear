import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Trash2 } from "lucide-react";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const PATH = "/ai-only-metadata-remover";

const AI_ONLY_FAQS: readonly FaqItem[] = [
	{
		question: "Why would I remove only AI metadata instead of all EXIF data?",
		answer:
			"Photographers and designers often use Photoshop Generative Fill, Lightroom AI Denoise, or a phone's AI object eraser on a genuine camera photo. Stripping all metadata would wipe out camera settings, copyright credits, lens info, and capture dates. AI-only mode targets just C2PA, AI source tags, and prompt chunks while keeping regular EXIF intact.",
	},
	{
		question: "Which tags are removed in AI-only mode?",
		answer:
			"SynthIDClear removes C2PA / JUMBF Content Credentials, XMP packets carrying DigitalSourceType or AI generator signatures, and PNG prompt/workflow text chunks (such as Stable Diffusion parameters or ComfyUI workflows).",
	},
	{
		question: "Which camera and copyright fields are preserved?",
		answer:
			"Standard EXIF camera headers (camera make/model, lens, exposure, ISO, aperture, capture date, copyright, and artist fields) plus ICC color profiles remain untouched, unless an EXIF block itself contains an explicit AI generator tag.",
	},
	{
		question: "Can I switch back to removing all metadata including GPS?",
		answer:
			"Yes. Open the Options drawer above the file queue at any time to toggle between “AI tags & prompts only” and “All hidden data” before cleaning.",
	},
];

const REMOVED_ITEMS = [
	"C2PA / JUMBF Content Credentials manifests",
	"XMP DigitalSourceType AI tags (trainedAlgorithmicMedia & compositeWithTrainedAlgorithmicMedia)",
	"PNG prompt, seed, and ComfyUI / Stable Diffusion workflow chunks",
	"Video C2PA and AI generator metadata boxes in MP4 & MOV",
] as const;

const KEPT_ITEMS = [
	"Camera Make, Model, Lens, ISO, Aperture, and Shutter Speed (EXIF)",
	"Artist, Author, and Copyright notices inside standard EXIF",
	"Original Display P3 / sRGB ICC color profile",
	"100% original pixels with zero re-compression",
] as const;

export const Route = createFileRoute("/ai-only-metadata-remover")({
	head: () =>
		buildRouteHead({
			title: "AI-Only Metadata Remover: Keep Camera EXIF | SynthIDClear",
			description:
				"Remove only C2PA, AI creator labels, and prompts while keeping camera EXIF, lens info, copyright & colors intact. Free, lossless & local in your browser.",
			path: PATH,
		}),
	component: AiOnlyMetadataRemoverPage,
});

function AiOnlyMetadataRemoverPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "All Tools", path: "/tools" },
					{ name: "AI-Only Metadata Remover", path: PATH },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — AI-Only Metadata Remover",
					description:
						"Selectively strip C2PA Content Credentials, IPTC AI tags, and prompt chunks while keeping camera EXIF and ICC color profiles intact.",
					path: PATH,
				})}
			/>
			<JsonLd data={buildFaqSchema(AI_ONLY_FAQS)} />

			<section className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
				<h1 className="m-0 text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-(--text-primary) sm:text-4xl">
					AI-Only Metadata Remover (Keep Camera EXIF)
				</h1>
				<p className="mx-auto my-0 max-w-2xl text-base leading-relaxed text-pretty text-(--text-secondary)">
					Pre-configured to strip only C2PA credentials, AI source labels, and
					saved prompts while keeping your camera EXIF, lens data, copyright,
					and color profile untouched. Ideal for real photos retouched with
					Photoshop Generative Fill or Lightroom AI.
				</p>
			</section>

			<CleanerWorkspace
				defaultOptions={{ stripScope: "ai-only" }}
				dropzoneHeading="Drop photos or videos to strip AI tags only"
				dropzoneSubtext="AI-only mode is active · Removes C2PA, AI labels & prompts while preserving camera EXIF & colors"
			/>

			<section aria-labelledby="ai-only-diff-heading" className="space-y-5">
				<h2
					id="ai-only-diff-heading"
					className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
				>
					What gets removed vs. what stays intact
				</h2>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-3 rounded-2xl border border-(--border-color) bg-(--bg-card) p-5">
						<h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-(--text-primary)">
							<Trash2
								className="h-4 w-4 text-(--brand-color)"
								aria-hidden="true"
							/>
							Removed automatically
						</h3>
						<ul className="m-0 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-(--text-secondary)">
							{REMOVED_ITEMS.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</div>

					<div className="space-y-3 rounded-2xl border border-(--border-color) bg-(--bg-card) p-5">
						<h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-(--text-primary)">
							<CheckCircle2
								className="h-4 w-4 text-(--success-color)"
								aria-hidden="true"
							/>
							Kept intact
						</h3>
						<ul className="m-0 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-(--text-secondary)">
							{KEPT_ITEMS.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
					<Link
						to="/photoshop-ai-metadata"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Guide: Photoshop &amp; Firefly AI Tags
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to="/instagram-ai-label"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Guide: Why Instagram Added an AI Info Label
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
			</section>

			<FaqAccordion
				heading="Common questions"
				items={AI_ONLY_FAQS}
				className="mt-0"
			/>
		</div>
	);
}
