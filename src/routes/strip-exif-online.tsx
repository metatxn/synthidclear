import { createFileRoute } from "@tanstack/react-router";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import {
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const EXIF_FAQS: readonly FaqItem[] = [
	{
		question: "What personal data is hidden inside EXIF headers?",
		answer:
			"EXIF headers often store exact GPS latitude and longitude coordinates, capture timestamps, phone or camera model, serial numbers, and editing software names.",
	},
	{
		question: "Will stripping EXIF wash out my iPhone or Display P3 colors?",
		answer:
			"Not with SynthIDClear. Our default cleaner strips EXIF and GPS data while keeping your original color profile intact.",
	},
	{
		question: "Is it safe to clean private photos here?",
		answer:
			"Yes. Your photos never leave your device — all cleaning runs locally inside your browser.",
	},
];

export const Route = createFileRoute("/strip-exif-online")({
	head: () =>
		buildRouteHead({
			title:
				"Remove EXIF & GPS Location Online — Private & Lossless | SynthIDClear",
			description:
				"Scrub EXIF camera data, GPS coordinates, and location tags from JPEG, PNG, WebP, HEIC, and AVIF photos locally in your browser with original quality kept.",
			path: "/strip-exif-online",
		}),
	component: StripExifPage,
});

function StripExifPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — Private EXIF & GPS Scrubber",
					description:
						"Losslessly remove EXIF, GPS location, and camera metadata from images directly in the browser.",
					path: "/strip-exif-online",
				})}
			/>
			<JsonLd data={buildFaqSchema(EXIF_FAQS)} />

			<section className="mb-8 space-y-2">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					Remove EXIF &amp; GPS Location Online
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					Scrub GPS coordinates, camera serial numbers, and timestamps from your
					photos in batches without uploading them or losing image quality.
				</p>
			</section>

			<CleanerWorkspace />

			<FaqAccordion heading="Common questions" items={EXIF_FAQS} />
		</div>
	);
}
