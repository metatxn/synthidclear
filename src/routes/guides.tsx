import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "#/components/JsonLd";
import { PLATFORM_GUIDES } from "#/lib/platformGuides";
import { buildBreadcrumbSchema, buildRouteHead } from "#/lib/seo";

const PATH = "/guides";

export const Route = createFileRoute("/guides")({
	head: () =>
		buildRouteHead({
			title: "AI Metadata & Platform Label Guides (2026) | SynthIDClear",
			description:
				"Learn what AI metadata Instagram, TikTok, ChatGPT, Gemini, Photoshop Firefly, Midjourney, Sora & Veo read or write — plus our 2026 AI Metadata Matrix.",
			path: PATH,
		}),
	component: GuidesHubPage,
});

function GuidesHubPage() {
	const socialGuides = PLATFORM_GUIDES.filter((g) => g.group === "social");
	const generatorGuides = PLATFORM_GUIDES.filter(
		(g) => g.group === "generator",
	);

	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "Platform Guides", path: PATH },
				])}
			/>

			<section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div className="space-y-2">
					<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
						Platform &amp; AI Generator Guides
					</h1>
					<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
						Plain-English breakdowns of what hidden metadata social apps check
						and what AI image or video tools write into your files — including
						honest limits on pixel watermarks like SynthID.
					</p>
				</div>

				<Link
					to="/tools"
					className="touch-target inline-flex shrink-0 items-center gap-2 rounded-xl border border-(--border-color) bg-(--bg-card) px-4 py-2.5 text-sm font-semibold text-(--text-primary) no-underline hover:border-(--text-primary)"
				>
					All Free Tools
					<ArrowRight className="h-4 w-4" aria-hidden="true" />
				</Link>
			</section>

			<Link
				to="/ai-metadata-matrix"
				className="group flex flex-col justify-between gap-4 rounded-2xl border border-(--brand-color)/30 bg-(--bg-surface) p-5 text-(--text-primary) no-underline hover:border-(--brand-color) sm:flex-row sm:items-center"
			>
				<div className="space-y-1">
					<span className="inline-block text-xs font-semibold tracking-wide text-(--brand-color) uppercase">
						2026 Reference Table
					</span>
					<h2 className="m-0 text-lg font-semibold text-(--text-primary) group-hover:text-(--brand-color)">
						2026 AI Metadata Matrix: C2PA, Prompts &amp; SynthID by Generator
					</h2>
					<p className="m-0 text-sm text-(--text-secondary)">
						Compare ChatGPT, Sora, Gemini, Veo, Adobe Firefly, Photoshop,
						Midjourney, ComfyUI, Stable Diffusion, Flux &amp; Runway side by
						side.
					</p>
				</div>
				<span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-(--brand-color)">
					View matrix
					<ArrowRight className="h-4 w-4" aria-hidden="true" />
				</span>
			</Link>

			<section aria-labelledby="social-guides-heading" className="space-y-4">
				<div className="space-y-1">
					<h2
						id="social-guides-heading"
						className="m-0 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)"
					>
						Social platform AI labels
					</h2>
					<p className="m-0 text-sm text-(--text-secondary)">
						Why social apps label photos or videos as AI-generated and which
						file tags they read.
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					{socialGuides.map((guide) => (
						<Link
							key={guide.to}
							to={guide.to}
							className="group flex items-center justify-between gap-3 rounded-xl border border-(--border-color) bg-(--bg-card) p-5 text-(--text-primary) no-underline hover:border-(--text-primary)"
						>
							<span className="space-y-1">
								<span className="block text-base font-semibold group-hover:text-(--brand-color)">
									{guide.title}
								</span>
								<span className="block text-xs text-(--text-secondary)">
									{guide.subtitle}
								</span>
							</span>
							<ArrowRight
								className="h-4 w-4 shrink-0 text-(--text-muted) group-hover:text-(--brand-color)"
								aria-hidden="true"
							/>
						</Link>
					))}
				</div>
			</section>

			<section aria-labelledby="generator-guides-heading" className="space-y-4">
				<div className="space-y-1">
					<h2
						id="generator-guides-heading"
						className="m-0 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)"
					>
						AI image &amp; video generators
					</h2>
					<p className="m-0 text-sm text-(--text-secondary)">
						Exactly which C2PA manifests, IPTC tags, prompts, or watermarks each
						tool embeds.
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{generatorGuides.map((guide) => (
						<Link
							key={guide.to}
							to={guide.to}
							className="group flex items-center justify-between gap-3 rounded-xl border border-(--border-color) bg-(--bg-card) p-4 text-(--text-primary) no-underline hover:border-(--text-primary)"
						>
							<span className="space-y-1">
								<span className="block text-sm font-semibold group-hover:text-(--brand-color)">
									{guide.title}
								</span>
								<span className="block text-xs text-(--text-secondary)">
									{guide.subtitle}
								</span>
							</span>
							<ArrowRight
								className="h-4 w-4 shrink-0 text-(--text-muted) group-hover:text-(--brand-color)"
								aria-hidden="true"
							/>
						</Link>
					))}
				</div>
			</section>
		</div>
	);
}
