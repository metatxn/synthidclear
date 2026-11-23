import { createFileRoute } from "@tanstack/react-router";
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
			<header className="space-y-3">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					Remove visible icons from photos and videos
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					Select a Gemini sparkle, a Veo corner logo, or another visible mark.
					The editor fills your selection with colors sampled from the
					surrounding pixels.
				</p>
			</header>
			<IconRemovalWorkspace />
			<div className="max-w-3xl space-y-2 text-sm leading-relaxed text-(--text-secondary)">
				<p className="m-0">
					Small marks on simple backgrounds work best. Images export as a still
					PNG. Videos (MP4, MOV, WebM, MKV) are processed locally in a Web
					Worker via WebCodecs at matching source bitrate with hidden metadata
					stripped by default, plus optional trim, crop, rotate, mute, and
					direct-to-disk streaming for large exports.
				</p>
				<p className="m-0">
					The editor targets visible marks only. Invisible signals such as
					Google SynthID are outside its scope.
				</p>
			</div>
		</div>
	);
}
