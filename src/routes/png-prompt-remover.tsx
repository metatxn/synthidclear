import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
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

			<section className="mx-auto mb-8 flex max-w-3xl flex-col gap-3 text-center">
				<h1 className="m-0 text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-(--text-primary) sm:text-4xl">
					Remove PNG Prompts &amp; Workflow Data
				</h1>
				<p className="mx-auto my-0 max-w-2xl text-base leading-relaxed text-pretty text-(--text-secondary)">
					Clean saved prompts, seeds, and ComfyUI workflow graphs out of PNG
					images locally with zero pixel re-encoding.
				</p>
			</section>

			<CleanerWorkspace
				dropzoneHeading="Drop Stable Diffusion, ComfyUI, or Midjourney PNGs here"
				dropzoneSubtext="Removes tEXt, iTXt, zTXt prompt chunks & C2PA losslessly · Transparency & 16-bit fidelity kept"
			/>

			<section aria-labelledby="png-chunks-heading" className="mt-12 space-y-4">
				<h2
					id="png-chunks-heading"
					className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
				>
					PNG prompt &amp; workflow chunks removed
				</h2>
				<div className="grid gap-3 md:grid-cols-3">
					<div className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							Automatic1111 &amp; Forge
						</h3>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Strips <code className="font-mono text-xs">parameters</code> text
							chunks holding positive/negative prompts, CFG scale, sampler,
							seed, and checkpoint hashes.
						</p>
					</div>
					<div className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							ComfyUI node graphs
						</h3>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Deletes embedded JSON{" "}
							<code className="font-mono text-xs">prompt</code> and{" "}
							<code className="font-mono text-xs">workflow</code> chunks so your
							custom node pipelines stay private.
						</p>
					</div>
					<div className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							NovelAI, Midjourney &amp; C2PA
						</h3>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Cleans plain (<code className="font-mono text-xs">tEXt</code>),
							international (<code className="font-mono text-xs">iTXt</code>),
							compressed (<code className="font-mono text-xs">zTXt</code>), and{" "}
							<code className="font-mono text-xs">caBX</code> C2PA chunks.
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
					<Link
						to="/midjourney-metadata"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Guide: Midjourney Image Metadata
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to="/ai-metadata-checker"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Inspect PNG Chunks &amp; Size
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
			</section>

			<FaqAccordion heading="Common questions" items={PNG_FAQS} />
		</div>
	);
}
