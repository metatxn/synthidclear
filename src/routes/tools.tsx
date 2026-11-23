import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "#/components/JsonLd";
import { PLATFORM_GUIDES } from "#/lib/platformGuides";
import { buildBreadcrumbSchema, buildRouteHead } from "#/lib/seo";
import { TOOL_CATALOG, type ToolCatalogEntry } from "#/lib/toolsCatalog";

const PATH = "/tools";

const TOOL_GROUPS: ReadonlyArray<{
	key: ToolCatalogEntry["category"];
	heading: string;
	description: string;
}> = [
	{
		key: "visual",
		heading: "Edit Photos & Videos",
		description: "Remove visible icons and logos from media.",
	},
	{
		key: "ai-metadata",
		heading: "Remove AI Metadata",
		description:
			"Strip C2PA Content Credentials, IPTC AI labels, and saved generation prompts losslessly.",
	},
	{
		key: "inspect",
		heading: "Check & Inspect a File",
		description:
			"Audit hidden AI provenance tags, GPS coordinates, camera EXIF, and metadata byte overhead.",
	},
	{
		key: "privacy",
		heading: "Protect Your Privacy",
		description:
			"Scrub GPS coordinates, camera serial numbers, timestamps, and XMP headers before sharing.",
	},
	{
		key: "formats",
		heading: "HEIC, PDF, Audio & Video",
		description:
			"Dedicated local tools for iPhone HEIC photos, PDF documents, MP3/WAV/FLAC/OGG/M4A audio, and MP4/MOV/MKV/WebM video files.",
	},
];

export const Route = createFileRoute("/tools")({
	head: () =>
		buildRouteHead({
			title: "Free Metadata & Visible Icon Tools | SynthIDClear",
			description:
				"Edit visible icons and browse free, browser-based tools for C2PA, AI metadata, EXIF, GPS, HEIC, PDF, and MP4 files.",
			path: PATH,
		}),
	component: ToolsHubPage,
});

function ToolsHubPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "All Free Tools", path: PATH },
				])}
			/>

			<section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div className="space-y-2">
					<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
						All Free Tools
					</h1>
					<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
						Edit visible marks or clean hidden metadata entirely in your
						browser, with zero uploads and zero sign-ups.
					</p>
				</div>

				<Link
					to="/"
					className="touch-target inline-flex shrink-0 items-center gap-2 rounded-xl bg-(--brand-color) px-4 py-2.5 text-sm font-semibold text-(--brand-text) no-underline hover:bg-(--brand-hover)"
				>
					Open All-in-One Cleaner
					<ArrowRight className="h-4 w-4" aria-hidden="true" />
				</Link>
			</section>

			<div className="space-y-10">
				{TOOL_GROUPS.map((group) => {
					const entries = TOOL_CATALOG.filter(
						(tool) => tool.category === group.key,
					);
					return (
						<section
							key={group.key}
							aria-labelledby={`group-${group.key}`}
							className="space-y-4"
						>
							<div className="space-y-1">
								<h2
									id={`group-${group.key}`}
									className="m-0 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)"
								>
									{group.heading}
								</h2>
								<p className="m-0 text-sm text-(--text-secondary)">
									{group.description}
								</p>
							</div>

							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{entries.map((tool) => (
									<Link
										key={tool.to}
										to={tool.to}
										className="group flex flex-col justify-between gap-3 rounded-xl border border-(--border-color) bg-(--bg-card) p-4 text-(--text-primary) no-underline hover:border-(--text-primary)"
									>
										<div className="space-y-1.5">
											<span className="block text-sm font-semibold text-(--text-primary) group-hover:text-(--brand-color)">
												{tool.title}
											</span>
											<span className="block text-xs leading-relaxed text-(--text-secondary)">
												{tool.subtitle}
											</span>
										</div>
										<div className="flex items-center justify-between gap-2 pt-1">
											<span className="text-[11px] font-medium text-(--text-muted)">
												{tool.formats}
											</span>
											<ArrowRight
												className="h-4 w-4 shrink-0 text-(--text-muted) group-hover:text-(--brand-color)"
												aria-hidden="true"
											/>
										</div>
									</Link>
								))}
							</div>
						</section>
					);
				})}
			</div>

			<section
				aria-labelledby="tools-guides-heading"
				className="space-y-4 border-t border-(--border-color) pt-8"
			>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2
						id="tools-guides-heading"
						className="m-0 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)"
					>
						Platform &amp; AI Generator Guides
					</h2>
					<Link
						to="/guides"
						className="inline-flex items-center gap-1 text-sm font-medium text-(--brand-color) no-underline hover:underline"
					>
						Browse all guides
						<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
					</Link>
				</div>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{PLATFORM_GUIDES.map((guide) => (
						<Link
							key={guide.to}
							to={guide.to}
							className="group flex flex-col justify-between gap-2 rounded-xl border border-(--border-color) bg-(--bg-card) p-4 text-(--text-primary) no-underline hover:border-(--text-primary)"
						>
							<div className="space-y-1">
								<span className="block text-sm font-semibold text-(--text-primary) group-hover:text-(--brand-color)">
									{guide.title}
								</span>
								<span className="block text-xs text-(--text-secondary)">
									{guide.subtitle}
								</span>
							</div>
							<ArrowRight
								className="h-4 w-4 text-(--text-muted) group-hover:text-(--brand-color)"
								aria-hidden="true"
							/>
						</Link>
					))}
				</div>
			</section>
		</div>
	);
}
