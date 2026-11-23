import { Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import type { CleanOptions } from "#/lib/metadata";
import { PLATFORM_GUIDES, type PlatformGuidePath } from "#/lib/platformGuides";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildSoftwareAppSchema,
} from "#/lib/seo";
import type { ToolPath } from "#/lib/toolsCatalog";

export interface GuideSignal {
	title: string;
	body: string;
}

export interface GuideLink {
	to: ToolPath;
	label: string;
}

export interface PlatformGuideProps {
	path: PlatformGuidePath;
	heading: string;
	intro: string;
	signalsHeading: string;
	signals: readonly GuideSignal[];
	steps: readonly string[];
	limits: readonly string[];
	extraLink?: GuideLink;
	visibleIconEditor?: boolean;
	defaultOptions?: Partial<CleanOptions>;
	faqs: readonly FaqItem[];
	schemaName: string;
	schemaDescription: string;
}

function renderNoBreakHyphens(text: string) {
	const parts = text.split(/(\S+-\S+)/g);
	let offset = 0;
	return parts.map((part) => {
		const start = offset;
		offset += part.length;
		if (!part.includes("-")) return part;
		return (
			<span key={start} className="whitespace-nowrap">
				{part}
			</span>
		);
	});
}

export function PlatformGuide({
	path,
	heading,
	intro,
	signalsHeading,
	signals,
	steps,
	limits,
	extraLink,
	visibleIconEditor,
	defaultOptions,
	faqs,
	schemaName,
	schemaDescription,
}: PlatformGuideProps) {
	const currentGuide = PLATFORM_GUIDES.find((guide) => guide.to === path);
	const related = PLATFORM_GUIDES.filter((guide) => guide.to !== path).slice(
		0,
		6,
	);

	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "Guides", path: "/guides" },
					{ name: currentGuide?.title ?? heading, path },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: schemaName,
					description: schemaDescription,
					path,
				})}
			/>
			<JsonLd data={buildFaqSchema(faqs)} />

			<section className="mx-auto max-w-3xl pt-2 text-center">
				<h1 className="m-0 text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-(--text-primary) sm:text-4xl lg:text-[2.75rem]">
					{renderNoBreakHyphens(heading)}
				</h1>
				<p className="mx-auto mt-4 mb-0 max-w-2xl text-base leading-relaxed text-pretty text-(--text-secondary) sm:text-lg">
					{intro}
				</p>
			</section>

			<CleanerWorkspace hideScopeBanner defaultOptions={defaultOptions} />

			<section aria-labelledby="signals-heading" className="space-y-5">
				<h2
					id="signals-heading"
					className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
				>
					{signalsHeading}
				</h2>
				<div className="grid gap-3 md:grid-cols-3">
					{signals.map((signal) => (
						<div
							key={signal.title}
							className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4"
						>
							<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
								{signal.title}
							</h3>
							<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
								{signal.body}
							</p>
						</div>
					))}
				</div>
			</section>

			<section aria-labelledby="steps-heading" className="space-y-4">
				<h2
					id="steps-heading"
					className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
				>
					How to check and clean your file
				</h2>
				<ol className="m-0 max-w-3xl list-decimal space-y-2 pl-5 text-sm leading-relaxed text-(--text-secondary) marker:font-semibold marker:text-(--text-primary)">
					{steps.map((step) => (
						<li key={step}>{step}</li>
					))}
				</ol>
			</section>

			<section
				aria-labelledby="limits-heading"
				className="space-y-3 rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6"
			>
				<h2
					id="limits-heading"
					className="m-0 flex items-center gap-2 text-base font-semibold text-(--text-primary)"
				>
					<Info className="h-4 w-4 text-(--text-muted)" aria-hidden="true" />
					What cleaning can't change
				</h2>
				<ul className="m-0 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-(--text-secondary)">
					{limits.map((limit) => (
						<li key={limit}>{limit}</li>
					))}
				</ul>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
					<Link
						to="/how-it-works"
						className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						How SynthIDClear works
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					{extraLink && (
						<Link
							to={extraLink.to}
							className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
						>
							{extraLink.label}
							<ArrowRight className="h-4 w-4" aria-hidden="true" />
						</Link>
					)}
					{visibleIconEditor && (
						<Link
							to="/visible-icon-remover"
							className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
						>
							Open Visible Icon Remover
							<ArrowRight className="h-4 w-4" aria-hidden="true" />
						</Link>
					)}
				</div>
			</section>

			<FaqAccordion heading="Common questions" items={faqs} className="mt-0" />

			<section aria-labelledby="related-heading" className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2
						id="related-heading"
						className="m-0 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)"
					>
						Other platform guides
					</h2>
					<Link
						to="/guides"
						className="inline-flex items-center gap-1 text-sm font-medium text-(--brand-color) no-underline hover:underline"
					>
						All platform guides
						<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
					</Link>
				</div>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{related.map((guide) => (
						<Link
							key={guide.to}
							to={guide.to}
							className="group flex items-center justify-between gap-2 rounded-xl border border-(--border-color) bg-(--bg-card) p-4 text-(--text-primary) no-underline hover:border-(--text-primary)"
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
