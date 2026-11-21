import { createFileRoute } from "@tanstack/react-router";
import type { FaqItem } from "#/components/FaqAccordion";
import { PlatformGuide } from "#/components/PlatformGuide";
import { buildRouteHead } from "#/lib/seo";

const PATH = "/tiktok-ai-label";

const FAQS: readonly FaqItem[] = [
	{
		question: "Why does my video say AI-generated when I didn't use AI?",
		answer:
			"Check the file for C2PA credentials. An app in your editing chain may have added them, for example an AI upscaler, template, or generator that writes Content Credentials on export.",
	},
	{
		question: "Does the cleaner work on large videos?",
		answer:
			"Yes. It rewrites only the small metadata boxes in an MP4 or MOV and leaves the video and audio streams alone, so nothing is re-encoded. For MKV or WebM, use the FFmpeg commands on the video metadata remover page.",
	},
	{
		question: "Can TikTok still label my video after cleaning?",
		answer:
			"Yes. Cleaning removes C2PA and other tags from the file. TikTok can still label a post because you used its AI effects, because of invisible watermarks, or because you turned on the AI-generated setting.",
	},
	{
		question: "Is my video uploaded anywhere?",
		answer:
			"No. The cleaner runs in your browser and never sends the file to a server, including ours.",
	},
];

export const Route = createFileRoute("/tiktok-ai-label")({
	head: () =>
		buildRouteHead({
			title: "TikTok AI-Generated Label: Check & Remove C2PA | SynthIDClear",
			description:
				"Find out why TikTok tagged your video or photo as AI-generated. Check it for C2PA Content Credentials and remove them from MP4, MOV, and images in your browser.",
			path: PATH,
		}),
	component: TiktokAiLabelPage,
});

function TiktokAiLabelPage() {
	return (
		<PlatformGuide
			path={PATH}
			heading="Why TikTok labeled your upload AI-generated, and what's in the file"
			intro="TikTok reads C2PA Content Credentials on uploads and labels matching posts as AI-generated. A video can pick up those credentials from any app that made or edited it. Drop the file below to see what it carries and remove the metadata before you post."
			signalsHeading="What TikTok looks at"
			signals={[
				{
					title: "C2PA Content Credentials",
					body: "TikTok was one of the first platforms to read C2PA on video. AI tools such as Sora and Adobe Firefly attach it to their exports, and some editors keep it when you re-export.",
				},
				{
					title: "XMP AI source tags",
					body: "Some editors write an IPTC DigitalSourceType value into the file's XMP block to mark it as AI-generated or AI-edited. The cleaner removes these along with C2PA.",
				},
				{
					title: "TikTok effects and your setting",
					body: "Posts made with TikTok's own AI effects get labeled automatically, and the AI-generated content setting adds the label by choice. Neither depends on file metadata.",
				},
			]}
			steps={[
				"Drop the original MP4, MOV, or image into the cleaner above. It scans the file on your device right away without uploading it.",
				"Check the summary tiles or open View raw metadata details to look for C2PA and AI source tags. If neither appears, metadata didn't trigger the label.",
				"Click Clean Video or Clean Image (or Clean All for a batch), then check the After Clean tab to confirm no AI tags remain.",
				"Download the cleaned file and upload it from your device. Don't re-share a video downloaded from TikTok, since TikTok attaches its own credentials to downloads.",
			]}
			limits={[
				"Videos made with TikTok's AI effects are labeled by TikTok, whatever the file contains.",
				"Invisible watermarks in the frames or audio, such as SynthID in videos from Google's Veo, stay after cleaning.",
				"TikTok requires creators to label realistic AI-generated content. Removing metadata doesn't change that rule.",
			]}
			extraLink={{
				to: "/video-metadata-remover",
				label: "Video Metadata Remover (FFmpeg CLI for MKV & WebM)",
			}}
			faqs={FAQS}
			schemaName="SynthIDClear TikTok AI Label Checker"
			schemaDescription="Check videos and photos for the C2PA metadata TikTok reads for its AI-generated label, and remove it locally in your browser."
		/>
	);
}
