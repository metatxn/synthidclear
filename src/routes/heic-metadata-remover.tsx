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

const PATH = "/heic-metadata-remover";

const HEIC_FAQS: readonly FaqItem[] = [
	{
		question: "Does cleaning an iPhone HEIC photo convert it to JPEG?",
		answer:
			"No. By default, SynthIDClear edits the HEIC container boxes directly in binary so your photo stays a native .heic file with zero pixel re-encoding and zero generation loss.",
	},
	{
		question: "Why can I clean HEIC files in Chrome or Firefox without errors?",
		answer:
			"Most online tools try to decode HEIC pixels via browser Canvas, which fails on Chrome, Firefox, and Edge. SynthIDClear parses and rewrites the ISOBMFF metadata boxes directly in JavaScript, so lossless HEIC and AVIF cleaning works in every desktop and mobile browser even if a preview thumbnail cannot render.",
	},
	{
		question: "Will my iPhone Display P3 wide-gamut colors stay accurate?",
		answer:
			"Yes. SynthIDClear preserves the colr / ICC color profile box inside your HEIC or AVIF file by default while stripping EXIF, GPS location, XMP, and C2PA metadata items.",
	},
	{
		question: "What metadata is hidden inside an iPhone HEIC photo?",
		answer:
			"iPhone HEIC photos typically embed an Exif item (camera model, lens, shutter speed, timestamps, GPS latitude/longitude/altitude), optional XMP or Apple editing history, and C2PA UUID boxes if edited in apps like Photoshop or Firefly.",
	},
];

const HEIC_BENEFITS = [
	{
		title: "True binary ISOBMFF stripping",
		body: "Removes EXIF, XMP, and C2PA metadata items from the HEIC / AVIF meta, iinf, and iloc box tables without touching the compressed HEVC / AV1 image bitstream.",
	},
	{
		title: "Display P3 colors preserved",
		body: "Keeps Apple Display P3 and sRGB ICC profiles intact so HDR and wide-gamut iPhone photos never come out flat or desaturated.",
	},
	{
		title: "Works in Chrome, Firefox, Safari & Edge",
		body: "Because pixels are never decoded or re-compressed, lossless HEIC cleaning runs locally on Windows, Linux, Android, macOS, and iOS.",
	},
] as const;

export const Route = createFileRoute("/heic-metadata-remover")({
	head: () =>
		buildRouteHead({
			title: "HEIC Metadata Remover — Lossless iPhone EXIF | SynthIDClear",
			description:
				"Strip EXIF, GPS, XMP & C2PA from iPhone HEIC & AVIF photos locally in Chrome, Firefox, Safari & Edge. No JPEG conversion, Display P3 kept, zero uploads.",
			path: PATH,
		}),
	component: HeicMetadataRemoverPage,
});

function HeicMetadataRemoverPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "All Tools", path: "/tools" },
					{ name: "HEIC Metadata Remover", path: PATH },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — Lossless HEIC & AVIF Metadata Remover",
					description:
						"Remove EXIF, GPS, XMP, and C2PA metadata from HEIC and AVIF images locally in any browser without re-encoding.",
					path: PATH,
				})}
			/>
			<JsonLd data={buildFaqSchema(HEIC_FAQS)} />

			<section className="space-y-2">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					HEIC &amp; AVIF Metadata Remover
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					Scrub GPS coordinates, iPhone camera EXIF, XMP, and C2PA tags out of
					HEIC and AVIF photos without converting to JPEG, uploading to a
					server, or washing out Display P3 colors.
				</p>
			</section>

			<CleanerWorkspace
				dropzoneHeading="Drop iPhone HEIC or AVIF photos here"
				dropzoneSubtext="Lossless ISOBMFF metadata stripping · Works in Chrome, Firefox, Safari & Edge · Display P3 kept"
			/>

			<section aria-labelledby="heic-how-heading" className="space-y-5">
				<h2
					id="heic-how-heading"
					className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
				>
					Why lossless HEIC cleaning matters
				</h2>
				<div className="grid gap-3 md:grid-cols-3">
					{HEIC_BENEFITS.map((item) => (
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
				aria-labelledby="heic-notes-heading"
				className="space-y-3 rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6"
			>
				<h2
					id="heic-notes-heading"
					className="m-0 flex items-center gap-2 text-base font-semibold text-(--text-primary)"
				>
					<Info className="h-4 w-4 text-(--text-muted)" aria-hidden="true" />
					Good to know about browser previews
				</h2>
				<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
					Non-Safari browsers (such as Chrome and Firefox on desktop) cannot
					natively display a thumbnail preview of HEIC images. Even when you see
					a &ldquo;HEIC&rdquo; badge instead of a preview image, SynthIDClear
					still parses every EXIF, GPS, XMP, and C2PA box and verifies that the
					cleaned .heic file contains zero remaining hidden metadata.
				</p>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
					<Link
						to="/remove-gps-from-photo"
						className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Remove GPS from Photos
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to="/ai-metadata-checker"
						className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Inspect Metadata Details
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
			</section>

			<FaqAccordion
				heading="Common questions"
				items={HEIC_FAQS}
				className="mt-0"
			/>
		</div>
	);
}
