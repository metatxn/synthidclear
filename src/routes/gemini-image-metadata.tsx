import { createFileRoute } from "@tanstack/react-router";
import type { FaqItem } from "#/components/FaqAccordion";
import { PlatformGuide } from "#/components/PlatformGuide";
import { buildRouteHead } from "#/lib/seo";

const PATH = "/gemini-image-metadata";

const FAQS: readonly FaqItem[] = [
	{
		question: "What metadata does Google Gemini or Imagen put in an image?",
		answer:
			"Images generated with Google Gemini or Imagen commonly carry IPTC DigitalSourceType (trainedAlgorithmicMedia) and credit/creator tags in XMP metadata, plus C2PA Content Credentials on supported surfaces. SynthIDClear lets you inspect and remove all of those metadata blocks losslessly.",
	},
	{
		question: "Does SynthIDClear remove Google SynthID?",
		answer:
			"No. Google SynthID is an invisible watermark encoded directly into the image pixels rather than the file header. Stripping file metadata removes XMP, IPTC, and C2PA tags, but it does not erase pixel-level SynthID watermarks.",
	},
	{
		question: "Does this remove the visible Gemini sparkle logo in the corner?",
		answer:
			"The Visible Icon Remover can repair the area around a Gemini sparkle. The lossless metadata cleaner preserves the original image pixels.",
	},
	{
		question: "Is my Gemini image uploaded to any server?",
		answer:
			"No. Inspection and metadata stripping happen 100% locally in your browser with zero uploads.",
	},
];

export const Route = createFileRoute("/gemini-image-metadata")({
	head: () =>
		buildRouteHead({
			title: "Gemini & Imagen Metadata vs. SynthID (2026) | SynthIDClear",
			description:
				"See what metadata Google Gemini & Imagen images carry (IPTC, XMP, C2PA), remove those tags losslessly in your browser, and see how they differ from SynthID.",
			path: PATH,
		}),
	component: GeminiImageMetadataPage,
});

function GeminiImageMetadataPage() {
	return (
		<PlatformGuide
			path={PATH}
			heading="What's inside a Gemini or Imagen image, and how metadata differs from SynthID"
			intro="Images created with Google Gemini and Imagen use two separate provenance layers: standard file metadata (IPTC/XMP tags and C2PA credentials) and pixel-level watermarks (SynthID and sometimes a visible corner sparkle). Drop your image below to inspect and remove the file metadata cleanly."
			signalsHeading="Three layers inside Gemini & Imagen files"
			signals={[
				{
					title: "IPTC & XMP AI tags",
					body: "Google writes DigitalSourceType (trainedAlgorithmicMedia) and Google AI credit fields into XMP/IPTC metadata blocks. SynthIDClear detects and removes these losslessly.",
				},
				{
					title: "C2PA Content Credentials",
					body: "When present in JPEG, PNG, or WebP exports, C2PA manifests record Google as the generator. Stripping container metadata removes the manifest cleanly.",
				},
				{
					title: "Google SynthID (pixels, not metadata)",
					body: "SynthID embeds imperceptible patterns directly into the image pixels so it survives crops, re-encoding, and metadata removal. SynthIDClear does not remove SynthID.",
				},
			]}
			steps={[
				"Drop your Gemini or Imagen PNG, JPEG, or WebP into the cleaner above. It scans the file locally on your device.",
				"Open View raw metadata details to see the exact XMP, IPTC DigitalSourceType, or C2PA entries stored in the file.",
				"Click Clean Image (or Clean All for a batch), then check the After Clean tab to verify 0 metadata tags remain.",
				"Download the cleaned image with its original pixels and color profile intact.",
			]}
			limits={[
				"Google SynthID lives inside the pixels themselves and remains detectable by SynthID tools after metadata cleaning.",
				"Visible corner logos or sparkle marks are drawn into the pixels and are not removed by metadata stripping.",
				"Platforms that integrate SynthID detection directly can still label the image even with empty file metadata.",
			]}
			extraLink={{
				to: "/ai-metadata-checker",
				label: "Open AI Metadata & C2PA Checker",
			}}
			visibleIconEditor
			faqs={FAQS}
			schemaName="SynthIDClear Gemini & Imagen Metadata Cleaner"
			schemaDescription="Inspect and remove IPTC, XMP, and C2PA metadata from Google Gemini and Imagen images locally in your browser, with clear guidance on SynthID pixel watermarks."
		/>
	);
}
