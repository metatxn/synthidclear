import { createFileRoute } from "@tanstack/react-router";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import { LandingHero } from "#/components/LandingHero";
import { LandingSections } from "#/components/LandingSections";
import {
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
	buildWebsiteSchema,
} from "#/lib/seo";
import { useCleanerState } from "#/lib/useCleanerState";

const HOME_FAQS: readonly FaqItem[] = [
	{
		question: "Do my images ever leave my device?",
		answer:
			"No. Everything runs locally inside your browser and nothing is ever uploaded to any server. You can even disconnect your Wi-Fi after loading the page and clean images completely offline.",
	},
	{
		question: "Will cleaning reduce image quality or wash out colors?",
		answer:
			"No. By default, SynthIDClear strips hidden metadata cleanly without re-compressing pixels, and keeps your original color profile so wide-gamut photos never look washed out.",
	},
	{
		question: "Why do social apps show AI labels on images?",
		answer:
			"Apps like Instagram and TikTok read hidden file metadata (such as C2PA tags and AI creator fields) to tag posts automatically. SynthIDClear shows you what is inside your file and removes those tags cleanly.",
	},
	{
		question:
			"Does this remove invisible pixel watermarks like Google SynthID?",
		answer:
			"No. Invisible pixel watermarks like Google SynthID are embedded inside the image pixels themselves rather than file metadata, so removing file metadata does not erase them.",
	},
	{
		question: "Is batch cleaning really free with no sign-up?",
		answer:
			"Yes. Because your own browser does all the work locally without server costs, you can clean single photos or full batches for free with no account required.",
	},
];

export const Route = createFileRoute("/")({
	head: () =>
		buildRouteHead({
			title: "SynthIDClear — Remove AI Metadata & EXIF (No Upload)",
			description:
				"Free, private metadata cleaner for PNG, JPEG, WebP, HEIC, AVIF, MP4, MOV & PDF. Strip C2PA, AI tags, prompts & GPS locally in your browser with zero quality loss.",
			path: "/",
		}),
	component: HomePage,
});

function HomePage() {
	const cleaner = useCleanerState();

	return (
		<div>
			<JsonLd data={buildWebsiteSchema()} />
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — Private Photo & Video Metadata Cleaner",
					description:
						"Clean AI creator tags, saved prompts, GPS location, and camera metadata from PNG, JPEG, WebP, HEIC, AVIF, MP4, and MOV files locally in your browser.",
					path: "/",
				})}
			/>
			<JsonLd data={buildFaqSchema(HOME_FAQS)} />

			<LandingHero cleaner={cleaner} />

			<LandingSections />

			<div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
				<FaqAccordion
					heading="Common questions"
					items={HOME_FAQS}
					className="mt-0"
				/>
			</div>
		</div>
	);
}
