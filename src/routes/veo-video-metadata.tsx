import { createFileRoute } from "@tanstack/react-router";
import type { FaqItem } from "#/components/FaqAccordion";
import { PlatformGuide } from "#/components/PlatformGuide";
import { buildRouteHead } from "#/lib/seo";

const PATH = "/veo-video-metadata";

const FAQS: readonly FaqItem[] = [
	{
		question: "What metadata is inside a Google Veo MP4 video?",
		answer:
			"Veo MP4 files can include container-level metadata atoms (such as encoder tags, creation timestamps, XMP/QuickTime fields, and C2PA provenance boxes when exported from supported surfaces). SynthIDClear reads and strips container metadata losslessly in your browser.",
	},
	{
		question:
			"Does SynthIDClear remove SynthID or visible watermarks from Veo videos?",
		answer:
			"No. Google Veo embeds invisible SynthID watermarks directly into the video frames and audio waveform, and some tiers also render a visible Veo corner mark. Metadata cleaning never modifies video frames or audio tracks, so those remain intact.",
	},
	{
		question: "Will cleaning a Veo MP4 re-encode the video or lower bitrate?",
		answer:
			"No. SynthIDClear only removes metadata boxes in the MP4 header while leaving the encoded video and audio bitstreams untouched — even large clips clean in under a second locally.",
	},
	{
		question: "Is my video uploaded to a server?",
		answer: "No. Everything runs locally in your browser with zero uploads.",
	},
];

export const Route = createFileRoute("/veo-video-metadata")({
	head: () =>
		buildRouteHead({
			title:
				"Google Veo Video Metadata: MP4 Tags vs. SynthID Watermarks | SynthIDClear",
			description:
				"Inspect and losslessly remove container metadata and C2PA tags from Google Veo MP4 videos in your browser, with clear guidance on SynthID video & audio watermarks.",
			path: PATH,
		}),
	component: VeoVideoMetadataPage,
});

function VeoVideoMetadataPage() {
	return (
		<PlatformGuide
			path={PATH}
			heading="What's inside a Google Veo MP4, and what metadata cleaning can remove"
			intro="Google Veo videos can carry both container-level MP4 metadata (timestamps, encoder tags, C2PA boxes) and media-level watermarks (SynthID in the video frames and audio, plus a visible corner mark on some plans). Drop your Veo MP4 below to inspect and remove the container metadata without re-encoding."
			signalsHeading="What a Google Veo MP4 can contain"
			signals={[
				{
					title: "MP4 container & C2PA boxes",
					body: "Standard MP4 metadata atoms (udta, meta, encoder strings, timestamps, and C2PA UUID boxes where present) that SynthIDClear reads and strips losslessly.",
				},
				{
					title: "SynthID video & audio watermarks",
					body: "Imperceptible signals embedded inside the visual frames and generated audio track. Because they live inside the media stream rather than headers, metadata cleaning does not remove them.",
				},
				{
					title: "Visible Veo watermark",
					body: "When rendered into the corner of the frame, it is part of the video pixels and is never altered by SynthIDClear.",
				},
			]}
			steps={[
				"Drop your Veo MP4 into the cleaner above. SynthIDClear reads only the container header locally without uploading the file.",
				"Open View raw metadata details to inspect every MP4 metadata box, encoder string, or C2PA tag inside the clip.",
				"Click Clean Video (or Clean All for a batch), then check the After Clean tab to confirm 0 container metadata tags remain.",
				"Download the cleaned MP4 with byte-for-byte original video and audio quality.",
			]}
			limits={[
				"SynthID watermarks inside the video frames and audio track remain untouched by metadata cleaning.",
				"Any visible Veo watermark rendered in the frames stays intact because frames are never re-encoded.",
				"Platforms such as YouTube and TikTok require disclosure for realistic AI-generated videos regardless of file metadata.",
			]}
			extraLink={{
				to: "/video-metadata-remover",
				label: "Video Metadata Remover (MP4, MOV & FFmpeg CLI)",
			}}
			faqs={FAQS}
			schemaName="SynthIDClear Google Veo Video Metadata Cleaner"
			schemaDescription="Inspect and losslessly remove MP4 container metadata and C2PA boxes from Google Veo videos locally in your browser without re-encoding."
		/>
	);
}
