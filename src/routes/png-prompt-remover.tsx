import { createFileRoute } from "@tanstack/react-router";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const PNG_FAQS: readonly FaqItem[] = [
	{
		question: "How do Stable Diffusion and ComfyUI save prompts inside PNGs?",
		answer:
			"Tools like Automatic1111, Forge, NovelAI, and ComfyUI embed your prompts, seeds, model hashes, and full node workflows inside hidden PNG text chunks.",
	},
	{
		question:
			"Does SynthIDClear remove both plain and compressed PNG prompt data?",
		answer:
			"Yes. SynthIDClear detects and removes all saved PNG text and workflow metadata along with any embedded C2PA or EXIF tags.",
	},
	{
		question: "Are transparency and original PNG colors preserved?",
		answer:
			"Yes. SynthIDClear keeps transparency, 16-bit fidelity, and color profiles untouched while removing only the hidden metadata.",
	},
];

export const Route = createFileRoute("/png-prompt-remover")({
	head: () =>
		buildRouteHead({
			title: "Remove PNG Prompts & ComfyUI Metadata Online | SynthIDClear",
			description:
				"Delete saved Stable Diffusion prompts, seeds, and ComfyUI workflow data from PNG images 100% locally in your browser without re-encoding.",
			path: "/png-prompt-remover",
		}),
	component: PngPromptRemoverPage,
});

function PngPromptRemoverPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "Remove PNG Prompts", path: "/png-prompt-remover" },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — PNG Prompt Remover",
					description:
						"Inspect and losslessly remove saved Stable Diffusion prompts and ComfyUI workflow data from PNG images locally.",
					path: "/png-prompt-remover",
				})}
			/>
			<JsonLd data={buildFaqSchema(PNG_FAQS)} />

			<section className="mb-8 space-y-2">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					Remove PNG Prompts &amp; Workflow Data
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					Clean saved prompts, seeds, and ComfyUI workflow graphs out of PNG
					images locally with zero pixel re-encoding.
				</p>
			</section>

			<CleanerWorkspace />

			<FaqAccordion heading="Common questions" items={PNG_FAQS} />
		</div>
	);
}
