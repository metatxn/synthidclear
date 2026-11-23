import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Terminal } from "lucide-react";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import { VideoCliPanel } from "#/components/VideoCliPanel";
import { VIDEO_ACCEPT } from "#/lib/format";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const VIDEO_FAQS: readonly FaqItem[] = [
	{
		question:
			"How can my browser clean MP4, MOV, MKV, and WebM files so quickly?",
		answer:
			"SynthIDClear strips container headers and remuxes video and audio streams directly on your device without re-encoding pixels. Even large clips clean quickly with zero quality loss.",
	},
	{
		question: "Does cleaning video metadata lose any video or audio quality?",
		answer:
			"No. In the default lossless mode, your original video and audio frames stay 100% untouched — only hidden metadata tags, C2PA labels, GPS, and timestamps are removed. You can also switch to Convert / Re-encode mode if you want to convert MOV, MKV, or WebM to MP4.",
	},
	{
		question: "What if I have a multi-gigabyte video file?",
		answer:
			"MP4, MOV, MKV, and WebM all clean directly in your browser. If you are processing massive multi-GB 4K archives offline, you can still expand the terminal helper at the bottom of this page for FFmpeg CLI commands.",
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
			title:
				"Video Metadata Remover: MP4, MOV, MKV & WebM (No Upload) | SynthIDClear",
			description:
				"Losslessly strip AI tags, C2PA Content Credentials, GPS coordinates & camera metadata from MP4, MOV, MKV, and WebM videos in your browser. Zero uploads, zero re-encoding.",
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
						"Lossless in-browser MP4, MOV, MKV, and WebM metadata remover with zero uploads.",
					path: "/video-metadata-remover",
				})}
			/>
			<JsonLd data={buildFaqSchema(VIDEO_FAQS)} />

			<section className="space-y-2">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					Video Metadata Remover (MP4, MOV, MKV &amp; WebM)
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					Remove hidden AI labels, GPS location, camera info, track names, and
					creation dates from MP4, MOV, MKV, and WebM videos right in your
					browser — nothing is uploaded and video quality stays 100% original.
				</p>
			</section>

			<CleanerWorkspace
				accept={VIDEO_ACCEPT}
				dropzoneHeading="Drop MP4, MOV, MKV, or WebM videos here"
				dropzoneSubtext="Lossless metadata strip or clean MP4/WebM re-encode · Stays on your device"
				hideSampleButton
			/>

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
							Advanced: Need multi-GB offline FFmpeg terminal commands?
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
