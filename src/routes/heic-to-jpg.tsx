import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import { HEIC_ACCEPT } from "#/lib/format";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const PATH = "/heic-to-jpg";

const HEIC_JPG_FAQS: readonly FaqItem[] = [
	{
		question: "Does HEIC to JPG work in Chrome, Firefox, and Edge on Windows?",
		answer:
			"Yes. SynthIDClear bundles a client-side libheif decoder that runs locally in a background browser worker, so you can convert iPhone HEIC and HEIF photos (including iOS 18+ files) to JPG, PNG, or WebP in Chrome, Firefox, Edge, and Safari with zero uploads.",
	},
	{
		question: "Does converting HEIC to JPG also remove GPS and EXIF metadata?",
		answer:
			"Yes. Every converted JPG automatically passes through our lossless metadata scrubber and binary verifier, confirming that GPS coordinates, iPhone camera EXIF, XMP, and C2PA tags are completely gone.",
	},
	{
		question: "Can I adjust JPG quality or convert HEIC to PNG / WebP instead?",
		answer:
			"Yes. Use the Output format selector and Quality slider (60%–100%, defaulted to 92%) right above the queue before clicking Clean All or Clean Image.",
	},
	{
		question:
			"What if I want to remove metadata while keeping my photo as native HEIC?",
		answer:
			"Use our dedicated HEIC Metadata Remover instead — it strips EXIF, GPS, XMP, and C2PA directly from the HEIC binary container without re-encoding pixels or converting to JPG.",
	},
];

const HEIC_JPG_BENEFITS = [
	{
		title: "Works in every browser",
		body: "Uses a local client-side libheif decoder (supporting modern iOS 18+ HEIC photos) so conversion works on Windows, macOS, Linux, Android, and iOS.",
	},
	{
		title: "Automatically metadata-clean",
		body: "Unlike typical HEIC converters that copy your home GPS coordinates into the output JPG, SynthIDClear strips all EXIF, GPS, XMP, and C2PA tags and verifies 0 remain.",
	},
	{
		title: "Unlimited private batches",
		body: "Convert dozens of iPhone photos at once and download a single ZIP archive — no upload wait times, file size paywalls, or accounts.",
	},
] as const;

export const Route = createFileRoute("/heic-to-jpg")({
	head: () =>
		buildRouteHead({
			title: "HEIC to JPG Converter (Free, Private, Clean) | SynthIDClear",
			description:
				"Convert iPhone HEIC & HEIF photos to clean JPG, PNG, or WebP in Chrome, Firefox, Edge & Safari. Strips GPS & EXIF automatically with zero server uploads.",
			path: PATH,
		}),
	component: HeicToJpgPage,
});

function HeicToJpgPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "All Tools", path: "/tools" },
					{ name: "HEIC to JPG Converter", path: PATH },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — Private HEIC to JPG Converter",
					description:
						"Convert iPhone HEIC/HEIF photos to JPG, PNG, or WebP locally in any browser with automatic GPS, EXIF, XMP, and C2PA metadata removal.",
					path: PATH,
				})}
			/>
			<JsonLd data={buildFaqSchema(HEIC_JPG_FAQS)} />

			<section className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
				<h1 className="m-0 text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-(--text-primary) sm:text-4xl">
					HEIC to JPG Converter (Metadata-Clean)
				</h1>
				<p className="mx-auto my-0 max-w-2xl text-base leading-relaxed text-pretty text-(--text-secondary)">
					Convert iPhone HEIC and HEIF photos to universally compatible JPG (or
					PNG / WebP) right in your browser — works in Chrome, Firefox, Edge,
					and Safari with GPS location and EXIF metadata automatically stripped.
				</p>
			</section>

			<CleanerWorkspace
				accept={HEIC_ACCEPT}
				defaultOptions={{
					mode: "deep",
					outputFormat: "image/jpeg",
					quality: 0.92,
				}}
				defaultOptionsOpen
				hideSampleButton
				hideScopeBanner
				dropzoneHeading="Drop iPhone HEIC or HEIF photos here to convert to JPG"
				dropzoneSubtext="Converts locally via libheif · Strips GPS, EXIF & AI metadata automatically · Zero uploads"
			/>

			<section
				aria-labelledby="heic-jpg-benefits-heading"
				className="space-y-5"
			>
				<h2
					id="heic-jpg-benefits-heading"
					className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
				>
					Why convert HEIC to JPG with SynthIDClear
				</h2>
				<div className="grid gap-3 md:grid-cols-3">
					{HEIC_JPG_BENEFITS.map((item) => (
						<div
							key={item.title}
							className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4"
						>
							<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
								{item.title}
							</h3>
							<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
								{item.body}
							</p>
						</div>
					))}
				</div>
			</section>

			<section
				aria-labelledby="heic-jpg-choice-heading"
				className="space-y-3 rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6"
			>
				<h2
					id="heic-jpg-choice-heading"
					className="m-0 flex items-center gap-2 text-base font-semibold text-(--text-primary)"
				>
					<Info className="h-4 w-4 text-(--text-muted)" aria-hidden="true" />
					Convert to JPG vs. Keep native HEIC
				</h2>
				<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
					Converting HEIC to JPG re-encodes the image for maximum compatibility
					on Windows, older web forms, and marketplaces, while scrubbing every
					metadata header. If you want to keep your original HEIC bitstream and
					Display P3 color profile with zero re-encoding, use the lossless HEIC
					metadata remover instead.
				</p>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
					<Link
						to="/heic-metadata-remover"
						className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Lossless HEIC Metadata Remover
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to="/remove-gps-from-photo"
						className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Remove GPS from Photos
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
			</section>

			<FaqAccordion
				heading="Common questions"
				items={HEIC_JPG_FAQS}
				className="mt-0"
			/>
		</div>
	);
}
