import { createFileRoute } from "@tanstack/react-router";
import type { FaqItem } from "#/components/FaqAccordion";
import { PlatformGuide } from "#/components/PlatformGuide";
import { buildRouteHead } from "#/lib/seo";

const PATH = "/instagram-ai-label";

const FAQS: readonly FaqItem[] = [
	{
		question: "Why did my real photo get an AI info label?",
		answer:
			"Usually an editing app wrote AI metadata into the file. Photoshop generative fill, Adobe Firefly, and some phone AI editors add C2PA credentials or an IPTC DigitalSourceType value even for a small edit. Instagram reads those tags and labels the post.",
	},
	{
		question: "Will removing the metadata guarantee the label goes away?",
		answer:
			"No. Cleaning removes the tags stored in the file, which is the most common trigger. Meta has said it also looks for invisible watermarks and other signals, and those aren't stored in metadata.",
	},
	{
		question: "Does cleaning lower the quality of my photo?",
		answer:
			"No. SynthIDClear removes metadata blocks without re-encoding, so the pixels and color profile stay as they were. Instagram still compresses the upload the way it does for every post.",
	},
	{
		question: "Is my photo uploaded anywhere?",
		answer:
			"No. The cleaner runs in your browser and never sends the file to a server, including ours.",
	},
];

export const Route = createFileRoute("/instagram-ai-label")({
	head: () =>
		buildRouteHead({
			title: "Instagram AI Info Label: Check & Remove Tags | SynthIDClear",
			description:
				"See why Instagram put an AI info label on your photo or Reel. Find the C2PA and IPTC tags that trigger it and remove them in your browser with no upload.",
			path: PATH,
		}),
	component: InstagramAiLabelPage,
});

function InstagramAiLabelPage() {
	return (
		<PlatformGuide
			path={PATH}
			heading="Why Instagram added an AI info label, and how to check your file"
			intro="Instagram and Facebook show an AI info label when a photo or video carries AI metadata, or when the person posting turns the label on. Real photos get it too, often after one generative edit in Photoshop or a phone's AI eraser. Drop the file below to see which tags it holds and remove them before you post."
			signalsHeading="What Instagram reads from your file"
			signals={[
				{
					title: "C2PA Content Credentials",
					body: "A signed record embedded in the file. Adobe Firefly, Photoshop generative fill, and AI image generators write it. Meta reads it when deciding whether to label a post.",
				},
				{
					title: "IPTC DigitalSourceType",
					body: "A field in the XMP or IPTC block. The value trainedAlgorithmicMedia means fully AI-generated, and compositeWithTrainedAlgorithmicMedia means edited with AI.",
				},
				{
					title: "Your own disclosure",
					body: "The AI label toggle in Instagram's advanced settings when you post. It has nothing to do with file metadata and stays your choice.",
				},
			]}
			steps={[
				"Drop your original photo or video into the cleaner above. It scans the file on your device right away without uploading it.",
				"Check the summary tiles or open View raw metadata details to look for C2PA and AI source tags. If neither appears, metadata didn't trigger the label.",
				"Click Clean Image or Clean Video (or Clean All for a batch), then check the After Clean tab to confirm no AI tags remain.",
				"Download the cleaned file and post it as a new upload. Editing an old post doesn't re-read the file.",
			]}
			limits={[
				"Meta has said it also checks for invisible watermarks and other signals. Those live outside the metadata, so Instagram can still label the post.",
				"Pixel watermarks such as Google SynthID stay in the image. Cleaning metadata never touches pixels.",
				"Meta's rules ask you to disclose realistic AI-generated images and video. Removing metadata doesn't change that.",
			]}
			faqs={FAQS}
			schemaName="SynthIDClear Instagram AI Label Checker"
			schemaDescription="Check photos and videos for the C2PA and IPTC metadata Instagram reads for its AI info label, and remove it locally in your browser."
		/>
	);
}
