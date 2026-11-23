import { createFileRoute } from "@tanstack/react-router";
import type { FaqItem } from "#/components/FaqAccordion";
import { PlatformGuide } from "#/components/PlatformGuide";
import { buildRouteHead } from "#/lib/seo";

const PATH = "/photoshop-ai-metadata";

const FAQS: readonly FaqItem[] = [
	{
		question:
			"Why did Photoshop Generative Fill add an AI label to my real photo?",
		answer:
			"When you use Generative Fill, Generative Expand, or Adobe Firefly in Photoshop and save with Content Credentials enabled, Adobe embeds a C2PA manifest and sets IPTC DigitalSourceType to compositeWithTrainedAlgorithmicMedia. Social platforms like Instagram read those tags and automatically apply an AI info label — even if 95% of the photo came from your camera.",
	},
	{
		question: "Can I remove Photoshop's AI tags without losing my camera EXIF?",
		answer:
			"Yes. The cleaner on this page defaults to AI-only mode (stripScope: ai-only), which removes C2PA Content Credentials and AI XMP tags while preserving your camera make, model, lens, exposure settings, copyright, and ICC color profile.",
	},
	{
		question: "Does this work for Adobe Firefly exports too?",
		answer:
			"Yes. Firefly downloads include signed C2PA manifests and IPTC trainedAlgorithmicMedia fields in JPEG, PNG, and WebP containers. SynthIDClear strips them losslessly without re-compressing pixels.",
	},
	{
		question: "Will cleaning affect my Display P3 or Adobe RGB color profile?",
		answer:
			"No. SynthIDClear preserves your embedded ICC color profile by default so exported retouches match Photoshop's colors.",
	},
];

export const Route = createFileRoute("/photoshop-ai-metadata")({
	head: () =>
		buildRouteHead({
			title: "Photoshop Generative Fill AI Tags: Keep EXIF | SynthIDClear",
			description:
				"Remove C2PA Content Credentials & compositeWithTrainedAlgorithmicMedia tags added by Photoshop Generative Fill or Firefly while keeping camera EXIF intact.",
			path: PATH,
		}),
	component: PhotoshopAiMetadataPage,
});

function PhotoshopAiMetadataPage() {
	return (
		<PlatformGuide
			path={PATH}
			heading="Photoshop Generative Fill & Firefly metadata, and how to strip only the AI tags"
			intro="Even a tiny retouch with Photoshop Generative Fill or Remove Tool can embed Adobe Content Credentials (C2PA) and an IPTC AI source tag, causing Instagram or clients' CMS tools to flag a real photograph as AI. The cleaner below starts in AI-only mode so you can remove Adobe's AI tags while keeping your camera EXIF and color profile."
			signalsHeading="What Photoshop & Firefly write into exports"
			signals={[
				{
					title: "Adobe Content Credentials (C2PA)",
					body: "A signed JUMBF manifest listing Photoshop or Adobe Firefly as the software agent along with generative edit actions.",
				},
				{
					title: "IPTC compositeWithTrainedAlgorithmicMedia",
					body: "An XMP/IPTC DigitalSourceType tag signaling that a real photograph contains AI-generated edits, or trainedAlgorithmicMedia for full Firefly generations.",
				},
				{
					title: "XMP edit history & tool metadata",
					body: "Photoshop XMP packets often carry CreatorTool, softwareAgent, and edit-history entries referencing Firefly or generative fill layers.",
				},
			]}
			steps={[
				"Drop your exported JPEG, PNG, WebP, or HEIC into the cleaner above. AI-only mode is already selected so your camera EXIF stays safe.",
				"Check the summary tiles or open View raw metadata details to confirm which C2PA and XMP tags Photoshop attached.",
				"Click Clean Image (or Clean All for a batch), then check the After Clean tab to verify 0 AI tags remain while your camera EXIF is kept.",
				"Download the cleaned file. Pixels and ICC color profiles remain 100% untouched.",
			]}
			limits={[
				"If you also want to scrub GPS location, camera serial numbers, or timestamps, open Options and switch from AI tags only to All hidden data.",
				"Re-exporting from Photoshop later with Content Credentials enabled will attach a fresh C2PA manifest.",
				"Social platforms may still require disclosure if an image is predominantly AI-generated.",
			]}
			defaultOptions={{ stripScope: "ai-only" }}
			extraLink={{
				to: "/ai-only-metadata-remover",
				label: "Open AI-Only Metadata Remover",
			}}
			faqs={FAQS}
			schemaName="SynthIDClear Photoshop & Firefly AI Metadata Remover"
			schemaDescription="Remove C2PA Content Credentials and AI edit tags added by Photoshop Generative Fill and Adobe Firefly while keeping camera EXIF and ICC color profiles intact."
		/>
	);
}
