import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const C2PA_FAQS: readonly FaqItem[] = [
	{
		question: "Where are C2PA Content Credentials stored inside an image?",
		answer:
			"C2PA manifests are embedded inside the image container alongside XMP AI creator tags (such as DigitalSourceType). SynthIDClear automatically finds and strips all of them.",
	},
	{
		question: "Does removing AI tags re-compress my image?",
		answer:
			"No. SynthIDClear removes C2PA and XMP metadata cleanly without re-compressing pixels, keeping original image quality and Display P3 / sRGB colors intact.",
	},
	{
		question: "Can I verify that all C2PA tags are gone?",
		answer:
			"Yes. Right after cleaning, SynthIDClear re-scans the output file and confirms all hidden AI tags and provenance data have been removed.",
	},
	{
		question: "Does removing C2PA also strip invisible pixel watermarks?",
		answer:
			"No. Pixel-level watermarks such as Google SynthID live inside the pixels rather than file metadata, so removing metadata headers does not erase them.",
	},
];

export const Route = createFileRoute("/remove-c2pa-metadata")({
	head: () =>
		buildRouteHead({
			title: "Remove C2PA Metadata & AI Tags (Free, Local) | SynthIDClear",
			description:
				"Strip C2PA Content Credentials and hidden AI creator labels from PNG, JPEG, WebP, HEIC, AVIF, MP4 & MOV locally in your browser with zero quality loss.",
			path: "/remove-c2pa-metadata",
		}),
	component: RemoveC2paPage,
});

function RemoveC2paPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "Remove AI Tags (C2PA)", path: "/remove-c2pa-metadata" },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — C2PA & AI Tag Remover",
					description:
						"Client-side tool to inspect and losslessly strip C2PA Content Credentials and AI creator metadata.",
					path: "/remove-c2pa-metadata",
				})}
			/>
			<JsonLd data={buildFaqSchema(C2PA_FAQS)} />

			<section className="mb-8 space-y-2">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					Remove C2PA &amp; AI Content Credentials
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					Strip hidden C2PA credentials and AI creator labels from PNG, JPEG,
					WebP, HEIC, and AVIF files right in your browser — zero uploads and
					zero quality loss.
				</p>
			</section>

			<CleanerWorkspace
				dropzoneHeading="Drop PNG, JPEG, WebP, HEIC, AVIF, MP4, or MOV files to strip C2PA"
				dropzoneSubtext="Removes C2PA JUMBF manifests & IPTC DigitalSourceType tags locally · Zero pixel re-encoding"
			/>

			<section aria-labelledby="c2pa-where-heading" className="mt-12 space-y-4">
				<h2
					id="c2pa-where-heading"
					className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
				>
					Where C2PA Content Credentials live in each format
				</h2>
				<div className="grid gap-3 md:grid-cols-3">
					<div className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							PNG &amp; WebP
						</h3>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Stored inside PNG <code className="font-mono text-xs">caBX</code>{" "}
							chunks and WebP C2PA/XMP RIFF chunks alongside IPTC AI source
							fields.
						</p>
					</div>
					<div className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							JPEG, HEIC &amp; AVIF
						</h3>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Embedded in JPEG <code className="font-mono text-xs">APP11</code>{" "}
							JUMBF segments or ISOBMFF UUID boxes in HEIC and AVIF photos.
						</p>
					</div>
					<div className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							MP4 &amp; MOV Videos
						</h3>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Stored as C2PA UUID boxes inside the MP4/MOV container (used by
							OpenAI Sora and C2PA-enabled video editors).
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
					<Link
						to="/ai-only-metadata-remover"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Want to keep camera EXIF? Use AI-Only Remover
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to="/ai-metadata-checker"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Inspect C2PA details first
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
			</section>

			<FaqAccordion heading="Common questions" items={C2PA_FAQS} />
		</div>
	);
}
