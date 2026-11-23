import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { JsonLd } from "#/components/JsonLd";
import { buildBreadcrumbSchema, buildRouteHead } from "#/lib/seo";

const PATH = "/privacy";

export const Route = createFileRoute("/privacy")({
	head: () =>
		buildRouteHead({
			title: "Privacy Policy — 100% Browser Processing | SynthIDClear",
			description:
				"SynthIDClear runs entirely on your device. Photos, videos, and PDF documents are never uploaded, stored, or shared with any server.",
			path: PATH,
		}),
	component: PrivacyPage,
});

function PrivacyPage() {
	return (
		<div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "Privacy Policy", path: PATH },
				])}
			/>

			<header className="space-y-2 border-b border-(--border-color) pb-6">
				<div className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--brand-color)">
					<Lock className="h-3.5 w-3.5" aria-hidden="true" />
					<span>Zero-Upload Guarantee</span>
				</div>
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					Privacy Policy
				</h1>
				<p className="m-0 text-sm text-(--text-secondary)">
					Last updated: November 23, 2026
				</p>
			</header>

			<div className="space-y-6 text-sm leading-relaxed text-(--text-secondary)">
				<section className="space-y-2 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-base font-semibold text-(--text-primary)">
						1. Your photos, videos, and PDFs never leave your device
					</h2>
					<p className="m-0">
						All metadata scanning, HEIC conversion, and cleaning in SynthIDClear
						happens locally inside your web browser using JavaScript and Web
						Workers. Your files are never uploaded to our servers, cloud
						storage, or third-party APIs. Once the page loads, you can
						disconnect your internet connection and continue cleaning files
						offline.
					</p>
				</section>

				<section className="space-y-2 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-base font-semibold text-(--text-primary)">
						2. No accounts, cookies, or tracking profiles
					</h2>
					<p className="m-0">
						SynthIDClear does not require an account and sets zero tracking
						cookies. We do not collect personal data, file names, prompts, GPS
						coordinates, PDF author fields, or thumbnails from the files you
						inspect or clean.
					</p>
				</section>

				<section className="space-y-2 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-base font-semibold text-(--text-primary)">
						3. Browser local storage
					</h2>
					<p className="m-0">
						We store only one optional preference in your browser&apos;s{" "}
						<code className="rounded border border-(--border-color) bg-(--bg-surface) px-1.5 py-0.5 font-mono text-xs text-(--text-primary)">
							localStorage
						</code>{" "}
						(<code className="font-mono text-xs">color-scheme</code>) if you
						switch between Light and Dark themes. You can clear it anytime in
						your browser settings.
					</p>
				</section>

				<section className="space-y-2 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-base font-semibold text-(--text-primary)">
						4. Independent verification
					</h2>
					<p className="m-0">
						SynthIDClear is served purely as static assets with zero backend
						upload endpoints. You can verify this at any time by opening your
						browser DevTools Network tab while inspecting or cleaning files —
						zero file bytes leave your browser.
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
