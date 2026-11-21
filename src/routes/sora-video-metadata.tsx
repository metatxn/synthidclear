import { createFileRoute } from "@tanstack/react-router";
import type { FaqItem } from "#/components/FaqAccordion";
import { PlatformGuide } from "#/components/PlatformGuide";
import { buildRouteHead } from "#/lib/seo";

const PATH = "/sora-video-metadata";

const FAQS: readonly FaqItem[] = [
	{
		question: "Do Sora videos have C2PA metadata?",
		answer:
			"Yes. OpenAI attaches C2PA Content Credentials to Sora videos, in addition to the visible watermark in the frames.",
	},
	{
		question: "Does SynthIDClear remove the Sora watermark?",
		answer:
			"No. The watermark is drawn into the video frames. SynthIDClear only edits metadata and never changes frames or audio.",
	},
	{
		question: "Is the video re-encoded?",
		answer:
			"No. The tool rewrites only the metadata boxes in the MP4, so quality stays the same and the file shrinks by the bytes removed (or stays about the same size for fragmented MP4s, where stripped boxes are padded to preserve stream offsets).",
	},
	{
		question: "Is my video uploaded anywhere?",
		answer:
			"No. The cleaner runs in your browser and never sends the file to a server, including ours.",
	},
];

export const Route = createFileRoute("/sora-video-metadata")({
	head: () =>
		buildRouteHead({
			title: "Sora Video Metadata: Check & Remove C2PA from MP4 | SynthIDClear",
			description:
				"Sora videos carry C2PA Content Credentials and a visible watermark. See what metadata your Sora MP4 holds and remove it in your browser without re-encoding.",
			path: PATH,
		}),
	component: SoraVideoMetadataPage,
});

function SoraVideoMetadataPage() {
	return (
		<PlatformGuide
			path={PATH}
			heading="What a Sora video carries, and which parts you can remove"
			intro="Videos from OpenAI's Sora come with C2PA Content Credentials in the MP4 and a moving watermark in the frames. The cleaner below reads and removes the metadata. It doesn't touch the frames, so the visible watermark stays."
			signalsHeading="What's in a Sora MP4"
			signals={[
				{
					title: "C2PA Content Credentials",
					body: "Stored in a box inside the MP4 container. It identifies Sora as the generator and marks the video as AI-generated.",
				},
				{
					title: "Visible watermark",
					body: "The moving Sora logo is part of the video frames. It isn't metadata, and SynthIDClear doesn't remove or alter it.",
				},
				{
					title: "OpenAI's own detection",
					body: "OpenAI has said it runs internal reverse image and audio search to recognize Sora output. That works without the file's metadata.",
				},
			]}
			steps={[
				"Drop the Sora MP4 into the cleaner above. It scans the file on your device right away without uploading it.",
				"Open View raw metadata details to see the C2PA box and any other metadata the video held.",
				"Click Clean Video (or Clean All for a batch), then check the After Clean tab to confirm no AI tags remain.",
				"Download the cleaned MP4. The video and audio streams are byte-for-byte the same.",
			]}
			limits={[
				"The visible Sora watermark stays, because it's part of the frames.",
				"OpenAI and other platforms can still identify the video through their own detection.",
				"Platforms such as TikTok and YouTube ask you to disclose realistic AI-generated video. Removing metadata doesn't change that.",
			]}
			extraLink={{
				to: "/video-metadata-remover",
				label: "Video Metadata Remover (FFmpeg CLI for MKV & WebM)",
			}}
			faqs={FAQS}
			schemaName="SynthIDClear Sora Video Metadata Remover"
			schemaDescription="Inspect and remove the C2PA Content Credentials in Sora MP4 videos without re-encoding, locally in your browser."
		/>
	);
}
