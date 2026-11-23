import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { IconRemovalWorkspace } from "#/components/IconRemovalWorkspace";
import { JsonLd } from "#/components/JsonLd";
import {
	buildBreadcrumbSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const PATH = "/visible-icon-remover";
const TITLE = "Visible Icon Remover";
const DESCRIPTION =
	"Remove visible logos and corner marks from photos and videos. Select the icon, preview the repair, and export locally in your browser.";

export const Route = createFileRoute("/visible-icon-remover")({
	head: () =>
		buildRouteHead({
			title: `${TITLE} for Images & Video | SynthIDClear`,
			description: DESCRIPTION,
			path: PATH,
		}),
	component: VisibleIconRemover,
});

function VisibleIconRemover() {
	return (
		<div className="mx-auto max-w-5xl space-y-7 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "All Free Tools", path: "/tools" },
					{ name: TITLE, path: PATH },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: TITLE,
					description: DESCRIPTION,
					path: PATH,
				})}
			/>
			<header className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
				<h1 className="m-0 text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-(--text-primary) sm:text-4xl">
					Remove visible icons from photos and videos
				</h1>
				<p className="mx-auto my-0 max-w-2xl text-base leading-relaxed text-pretty text-(--text-secondary)">
					Select a Gemini sparkle, a Veo corner logo, or another visible mark.
					The editor fills your selection with colors sampled from the
					surrounding pixels.
				</p>
			</header>
			<IconRemovalWorkspace />
			<aside
				aria-label="Scope and export details"
				className="flex flex-col gap-2.5 rounded-2xl border border-(--border-color) bg-(--bg-surface) px-5 py-4 text-sm leading-relaxed text-(--text-secondary)"
			>
				<p className="m-0">
					Small marks on simple backgrounds work best. Images export as a still
					PNG. Videos (MP4, MOV, WebM, MKV) are processed locally in a Web
					Worker via WebCodecs at matching source bitrate with hidden metadata
					stripped by default, plus optional trim, crop, rotate, mute, and
					direct-to-disk streaming for large exports.
				</p>
				<p className="m-0">
					The editor targets visible marks only. Invisible signals such as
					Google SynthID are outside its scope.{" "}
					<Link
						to="/advanced-media-guide"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Read the Advanced Video &amp; Audio Operations Guide
						<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
					</Link>
				</p>
			</aside>
		</div>
	);
}
