import { createFileRoute, Link } from "@tanstack/react-router";
import { buildRouteHead } from "#/lib/seo";

export const Route = createFileRoute("/terms")({
	head: () =>
		buildRouteHead({
			title: "Terms of Use | SynthIDClear",
			description:
				"Simple, transparent terms of use for SynthIDClear — free local browser metadata cleaner for photos and videos.",
			path: "/terms",
		}),
	component: TermsPage,
});

function TermsPage() {
	return (
		<div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
			<header className="space-y-2 border-b border-(--border-color) pb-6">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					Terms of Use
				</h1>
				<p className="m-0 text-sm text-(--text-secondary)">
					Last updated: November 21, 2026
				</p>
			</header>

			<div className="space-y-6 text-sm leading-relaxed text-(--text-secondary)">
				<section className="space-y-2 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-base font-semibold text-(--text-primary)">
						1. Free client-side utility
					</h2>
					<p className="m-0">
						SynthIDClear is provided free of charge for personal and commercial
						use to inspect and remove container metadata from your own photo and
						video files directly inside your browser.
					</p>
				</section>

				<section className="space-y-2 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-base font-semibold text-(--text-primary)">
						2. Platform disclosure &amp; watermark limits
					</h2>
					<p className="m-0">
						You are responsible for complying with the disclosure rules of any
						social platform or publisher where you post content. Cleaning
						removes file-level metadata (C2PA, XMP, EXIF, GPS, PNG prompts,
						QuickTime tags), and does not erase imperceptible pixel- or
						signal-level watermarks such as Google SynthID.
					</p>
				</section>

				<section className="space-y-2 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-base font-semibold text-(--text-primary)">
						3. No warranty
					</h2>
					<p className="m-0">
						The tool is provided &quot;as is&quot; without warranties of any
						kind. Always keep backups of original media files before modifying
						or distributing cleaned copies.
					</p>
				</section>

				<div className="pt-2">
					<Link
						to="/"
						className="text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						← Back to cleaner
					</Link>
				</div>
			</div>
		</div>
	);
}
