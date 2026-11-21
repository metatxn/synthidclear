import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { HowItWorksPanel } from "#/components/HowItWorksPanel";
import { JsonLd } from "#/components/JsonLd";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
} from "#/lib/seo";

const HOW_FAQS: readonly FaqItem[] = [
	{
		question: "How can I verify that SynthIDClear does not upload my images?",
		answer:
			"Open your browser DevTools Network tab while cleaning images or simply disconnect your Wi-Fi after loading the page — everything continues working locally.",
	},
	{
		question: "How does SynthIDClear stay fast and stable on phones?",
		answer:
			"Batches process up to 2 images at a time to keep memory usage low, and temporary browser URLs are cleaned up automatically.",
	},
	{
		question: "Why are pixel watermarks different from file metadata?",
		answer:
			"File metadata lives in container headers (EXIF, XMP, C2PA, PNG text) that can be removed cleanly without altering pixels. Pixel watermarks like Google SynthID embed patterns directly into the pixel values so they survive metadata cleaning.",
	},
];

export const Route = createFileRoute("/how-it-works")({
	head: () =>
		buildRouteHead({
			title: "How SynthIDClear Works — Privacy, Quality & Technical Limits",
			description:
				"Learn how SynthIDClear strips metadata from photos and videos in your browser, preserves color profiles, and why pixel watermarks differ.",
			path: "/how-it-works",
		}),
	component: HowItWorksPage,
});

function HowItWorksPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "How It Works", path: "/how-it-works" },
				])}
			/>
			<JsonLd data={buildFaqSchema(HOW_FAQS)} />

			<section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div className="space-y-2">
					<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
						How SynthIDClear Works
					</h1>
					<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
						A transparent look at how we remove hidden metadata locally without
						touching image quality, plus what metadata cleaning does and does
						not cover.
					</p>
				</div>

				<Link
					to="/"
					className="touch-target inline-flex shrink-0 items-center gap-2 rounded-xl bg-(--brand-color) px-4 py-2.5 text-sm font-semibold text-(--brand-text) no-underline hover:bg-(--brand-hover)"
				>
					Open Cleaner
					<ArrowRight className="h-4 w-4" aria-hidden="true" />
				</Link>
			</section>

			<HowItWorksPanel />

			<FaqAccordion heading="Common questions" items={HOW_FAQS} />
		</div>
	);
}
