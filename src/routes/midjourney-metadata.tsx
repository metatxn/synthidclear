import { createFileRoute } from "@tanstack/react-router";
import type { FaqItem } from "#/components/FaqAccordion";
import { PlatformGuide } from "#/components/PlatformGuide";
import { buildRouteHead } from "#/lib/seo";

const PATH = "/midjourney-metadata";

const FAQS: readonly FaqItem[] = [
	{
		question: "Does Midjourney embed my prompt inside downloaded images?",
		answer:
			"Yes, depending on where you download it. PNG images saved from Midjourney (especially via the web app or Discord original files) often store your prompt in a PNG Description text chunk along with Author, Creation Time, and Job ID metadata, plus IPTC DigitalSourceType tags.",
	},
	{
		question: "What metadata does Midjourney add to WebP or JPEG exports?",
		answer:
			"Midjourney WebP and JPEG downloads can carry XMP or EXIF blocks containing the prompt description, Midjourney creator attribution, and IPTC DigitalSourceType (trainedAlgorithmicMedia). SynthIDClear strips all of them losslessly.",
	},
	{
		question:
			"Does removing Midjourney metadata reduce resolution or sharpness?",
		answer:
			"No. SynthIDClear removes only the PNG text chunks and XMP/EXIF/IPTC metadata blocks without re-encoding pixels, so your upscaled Midjourney image stays byte-for-byte identical visually.",
	},
	{
		question: "Are my Midjourney prompts or images uploaded anywhere?",
		answer:
			"No. Everything runs locally in your browser so your private prompts and images never touch any server.",
	},
];

export const Route = createFileRoute("/midjourney-metadata")({
	head: () =>
		buildRouteHead({
			title: "Midjourney Metadata: Remove Prompts & AI Tags | SynthIDClear",
			description:
				"Inspect and remove hidden prompts, Job IDs, Author fields & IPTC DigitalSourceType tags from Midjourney PNG, JPEG & WebP images locally with no uploads.",
			path: PATH,
		}),
	component: MidjourneyMetadataPage,
});

function MidjourneyMetadataPage() {
	return (
		<PlatformGuide
			path={PATH}
			heading="What metadata Midjourney embeds, and how to strip your prompt cleanly"
			intro="Midjourney images downloaded as PNG or WebP frequently carry your full generation prompt, job ID, and IPTC AI source tags inside hidden metadata blocks. Drop a file below to see exactly what's saved inside and remove it losslessly without touching image quality."
			signalsHeading="What Midjourney stores in image files"
			signals={[
				{
					title: "PNG text chunks (Description & Author)",
					body: "Midjourney PNG files often embed the exact prompt text, parameters, and job ID inside tEXt or iTXt chunks that anyone can read with a metadata viewer.",
				},
				{
					title: "IPTC DigitalSourceType",
					body: "Midjourney writes DigitalSourceType set to trainedAlgorithmicMedia in XMP/IPTC metadata so social apps like Instagram and TikTok can auto-label uploads.",
				},
				{
					title: "Creator & timestamp headers",
					body: "Creation timestamps, Author/Job IDs, and software identifiers stored in EXIF, XMP, or PNG chunks.",
				},
			]}
			steps={[
				"Drop your Midjourney PNG, WebP, or JPEG into the cleaner above. It scans the file instantly on your device.",
				"Open View raw metadata details to check whether your prompt text, job ID, or IPTC AI tags are embedded.",
				"Click Clean Image (or Clean All for a batch), then switch to the After Clean tab to confirm 0 metadata items remain.",
				"Download the cleaned image ready for client delivery or publishing, with zero re-compression.",
			]}
			limits={[
				"Images saved via screenshots or re-saved through apps that strip metadata may already have empty headers; the inspector will show you right away.",
				"Cleaning removes file metadata only and does not alter visual style or pixels.",
				"Platforms may still ask you to disclose AI-generated content under their community rules.",
			]}
			extraLink={{
				to: "/png-prompt-remover",
				label: "PNG Prompt & ComfyUI Metadata Remover",
			}}
			faqs={FAQS}
			schemaName="SynthIDClear Midjourney Metadata & Prompt Remover"
			schemaDescription="Inspect and losslessly remove saved prompts, job IDs, and IPTC DigitalSourceType tags from Midjourney PNG, JPEG, and WebP images in your browser."
		/>
	);
}
