import { createFileRoute } from "@tanstack/react-router";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import {
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
			title:
				"Remove C2PA Metadata & AI Content Credentials Online | SynthIDClear",
			description:
				"Clean C2PA Content Credentials and hidden AI creator labels from PNG, JPEG, WebP, HEIC, and AVIF images 100% locally in your browser with original quality kept.",
			path: "/remove-c2pa-metadata",
		}),
	component: RemoveC2paPage,
});

function RemoveC2paPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
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

			<CleanerWorkspace />

			<FaqAccordion heading="Common questions" items={C2PA_FAQS} />
		</div>
	);
}
