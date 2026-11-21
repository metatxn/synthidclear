import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Terminal } from "lucide-react";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import { VideoCliPanel } from "#/components/VideoCliPanel";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const VIDEO_FAQS: readonly FaqItem[] = [
	{
		question: "How can my browser clean large MP4 or MOV files so quickly?",
		answer:
			"SynthIDClear only reads the small file header where hidden metadata lives while leaving the video and audio streams untouched on your device. Even large 500 MB clips clean in under a second with zero re-encoding.",
	},
	{
		question: "Does cleaning video metadata lose any video or audio quality?",
		answer:
			"No. Your original video and audio frames stay 100% untouched — only the hidden metadata tags are removed.",
	},
	{
		question: "What if I have an MKV, WebM, or multi-gigabyte video file?",
		answer:
			"You can expand the advanced terminal helper at the bottom of this page for offline FFmpeg commands that handle MKV, WebM, and extra-large exports.",
	},
	{
		question: "Will removing video metadata erase invisible AI watermarks?",
		answer:
			"No. Cleaning removes hidden file data like dates, GPS, encoder tags, and C2PA labels, while invisible video or audio watermarks like SynthID live inside the media signal itself.",
	},
];

export const Route = createFileRoute("/video-metadata-remover")({
	head: () =>
		buildRouteHead({
			title: "Video Metadata Remover — Clean MP4 & MOV | SynthIDClear",
			description:
				"Losslessly strip AI tags, C2PA Content Credentials, GPS coordinates, and camera metadata from MP4 and MOV videos directly in your browser with zero uploads.",
			path: "/video-metadata-remover",
		}),
	component: VideoMetadataRemoverPage,
});

function VideoMetadataRemoverPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "Video Metadata Remover", path: "/video-metadata-remover" },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — In-Browser Video Metadata Remover",
					description:
						"Lossless in-browser MP4 and MOV metadata remover with zero uploads.",
					path: "/video-metadata-remover",
				})}
			/>
			<JsonLd data={buildFaqSchema(VIDEO_FAQS)} />

			<section className="space-y-2">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					Video Metadata Remover (MP4 &amp; MOV)
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					Remove hidden AI labels, GPS location, camera info, and creation dates
					from MP4 and MOV videos right in your browser — nothing is uploaded
					and video quality stays 100% original.
				</p>
			</section>

			<CleanerWorkspace />

			<FaqAccordion heading="Common questions" items={VIDEO_FAQS} />

			{/* Subtle collapsible disclosure so terminal commands stay tucked away from everyday users */}
			<details className="group rounded-2xl border border-(--border-color) bg-(--bg-card) px-5 py-4">
				<summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) [&::-webkit-details-marker]:hidden">
					<span className="inline-flex items-center gap-2">
						<Terminal
							className="h-4 w-4 text-(--text-muted)"
							aria-hidden="true"
						/>
						<span>
							Advanced: Need MKV, WebM, or multi-GB terminal commands?
						</span>
					</span>
					<ChevronDown
						className="h-4 w-4 shrink-0 text-(--text-muted) transition-transform group-open:rotate-180"
						aria-hidden="true"
					/>
				</summary>
				<div className="mt-4 border-t border-(--border-color) pt-4">
					<VideoCliPanel />
				</div>
			</details>
		</div>
	);
}
