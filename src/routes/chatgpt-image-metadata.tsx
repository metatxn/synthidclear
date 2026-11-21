import { createFileRoute } from "@tanstack/react-router";
import type { FaqItem } from "#/components/FaqAccordion";
import { PlatformGuide } from "#/components/PlatformGuide";
import { buildRouteHead } from "#/lib/seo";

const PATH = "/chatgpt-image-metadata";

const FAQS: readonly FaqItem[] = [
	{
		question: "Do ChatGPT images have metadata?",
		answer:
			"Yes. OpenAI adds C2PA Content Credentials to images generated in ChatGPT and through its image API. The manifest names OpenAI as the source and marks the image as AI-generated.",
	},
	{
		question: "How can I see the metadata in my ChatGPT image?",
		answer:
			"Drop the file into the cleaner above and open View raw metadata details. It lists every metadata block it found, including the C2PA manifest, and lets you compare Before and After Clean once you strip it.",
	},
	{
		question: "Does removing the metadata change the image?",
		answer:
			"No. The pixels and color profile stay the same. Only the metadata chunks are removed, and the tool re-scans the output to confirm.",
	},
	{
		question: "What about screenshots or images saved from social media?",
		answer:
			"Those usually have no C2PA left. A screenshot is a new file, and many sites strip metadata on upload. The cleaner will show you what's there either way.",
	},
];

export const Route = createFileRoute("/chatgpt-image-metadata")({
	head: () =>
		buildRouteHead({
			title: "ChatGPT Image Metadata: View & Remove C2PA | SynthIDClear",
			description:
				"Images from ChatGPT and DALL·E carry C2PA metadata that names OpenAI as the source. See what's in your file and remove it in your browser with no upload.",
			path: PATH,
		}),
	component: ChatgptImageMetadataPage,
});

function ChatgptImageMetadataPage() {
	return (
		<PlatformGuide
			path={PATH}
			heading="What's inside a ChatGPT image file, and how to remove it"
			intro="Images you create in ChatGPT or through OpenAI's image API ship with C2PA Content Credentials. The manifest records that an OpenAI model generated the image. Drop a file below to read the metadata and strip it without re-encoding the pixels."
			signalsHeading="What OpenAI puts in the file"
			signals={[
				{
					title: "C2PA manifest",
					body: "A signed record stored in a caBX chunk in PNG files, or the equivalent block in JPEG and WebP. It names OpenAI as the generator and logs the creation step.",
				},
				{
					title: "AI source type",
					body: "Inside the manifest, the digital source type is set to trainedAlgorithmicMedia, the standard value for fully AI-generated media.",
				},
				{
					title: "No visible watermark",
					body: "OpenAI doesn't draw a visible mark on ChatGPT images, so the metadata is what other apps and checkers read from the file itself.",
				},
			]}
			steps={[
				"Download the image from ChatGPT and drop it into the cleaner above. It scans the file on your device right away without uploading it.",
				"Open View raw metadata details to see the C2PA manifest and any other metadata the file held.",
				"Click Clean Image (or Clean All for a batch), then check the After Clean tab to confirm no AI tags remain.",
				"Download the cleaned PNG, JPEG, or WebP. The pixels match the original exactly.",
			]}
			limits={[
				"OpenAI has said it keeps internal tools that recognize its own images. Those don't rely on file metadata.",
				"Social platforms can still apply AI labels based on their own detection or your disclosure.",
				"Many platforms ask you to disclose realistic AI-generated images. Removing metadata doesn't change that.",
			]}
			faqs={FAQS}
			schemaName="SynthIDClear ChatGPT Image Metadata Remover"
			schemaDescription="Inspect and remove the C2PA Content Credentials OpenAI adds to ChatGPT and DALL·E images, locally in your browser."
		/>
	);
}
