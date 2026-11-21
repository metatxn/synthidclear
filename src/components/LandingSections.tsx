import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Camera,
	Infinity as InfinityIcon,
	Layers,
	Lock,
	MapPin,
	MessageSquareText,
	ShieldCheck,
} from "lucide-react";
import { PLATFORM_GUIDES } from "#/lib/platformGuides";

const SUPPORTED_TOOLS = [
	"ChatGPT",
	"Sora",
	"Gemini",
	"Midjourney",
	"Adobe Firefly",
	"Photoshop",
	"Stable Diffusion",
	"ComfyUI",
	"iPhone & Cameras",
] as const;

const WHAT_GETS_CLEANED = [
	{
		icon: ShieldCheck,
		title: "AI Creator Labels",
		description:
			"Hidden provenance tags that social platforms read to automatically label posts as AI-generated.",
	},
	{
		icon: MessageSquareText,
		title: "Saved AI Prompts",
		description:
			"Prompts, seeds, and generator settings stored silently inside PNG files from tools like ComfyUI or Stable Diffusion.",
	},
	{
		icon: MapPin,
		title: "GPS Location",
		description:
			"Exact coordinates stored inside smartphone and camera photos showing where an image was taken.",
	},
	{
		icon: Camera,
		title: "Camera & Edit Info",
		description:
			"Phone or camera model, serial numbers, capture timestamps, and editing software history.",
	},
] as const;

const MORE_TOOLS = [
	{
		to: "/remove-c2pa-metadata" as const,
		title: "Remove AI Tags (C2PA)",
		subtitle: "Strip Content Credentials & AI labels",
	},
	{
		to: "/strip-exif-online" as const,
		title: "Remove EXIF & GPS",
		subtitle: "Scrub location & camera details",
	},
	{
		to: "/png-prompt-remover" as const,
		title: "Remove PNG Prompts",
		subtitle: "Delete saved Stable Diffusion & ComfyUI prompts",
	},
	{
		to: "/video-metadata-remover" as const,
		title: "Video Metadata Remover",
		subtitle: "Clean MP4 & MOV directly in your browser",
	},
];

export function LandingSections() {
	return (
		<div className="mx-auto max-w-5xl space-y-16 px-4 py-12 sm:px-6 lg:py-16">
			{/* Supported Tools Strip */}
			<section
				aria-label="Works with photos and videos from"
				className="text-center"
			>
				<p className="m-0 mb-3.5 text-xs font-medium text-(--text-muted)">
					Works with photos &amp; videos from
				</p>
				<ul className="m-0 flex list-none flex-wrap items-center justify-center gap-2 p-0">
					{SUPPORTED_TOOLS.map((tool) => (
						<li
							key={tool}
							className="rounded-full border border-(--border-color) bg-(--bg-card) px-3.5 py-1 text-xs font-medium text-(--text-secondary)"
						>
							{tool}
						</li>
					))}
				</ul>
			</section>

			{/* 3 Plain-English Benefits */}
			<section aria-labelledby="benefits-heading" className="space-y-6">
				<h2 id="benefits-heading" className="visually-hidden">
					Why use SynthIDClear
				</h2>
				<div className="grid gap-4 md:grid-cols-3">
					<div className="rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6">
						<Lock
							className="mb-3 h-5 w-5 text-(--brand-color)"
							aria-hidden="true"
						/>
						<h3 className="m-0 text-base font-semibold text-(--text-primary)">
							Stays on your device
						</h3>
						<p className="mt-1.5 mb-0 text-sm leading-relaxed text-(--text-secondary)">
							Photos never leave your browser. Turn off Wi-Fi after loading to
							verify.
						</p>
					</div>

					<div className="rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6">
						<Layers
							className="mb-3 h-5 w-5 text-(--brand-color)"
							aria-hidden="true"
						/>
						<h3 className="m-0 text-base font-semibold text-(--text-primary)">
							Zero quality loss
						</h3>
						<p className="mt-1.5 mb-0 text-sm leading-relaxed text-(--text-secondary)">
							Cleans hidden data without re-compressing pixels or washing out
							your colors.
						</p>
					</div>

					<div className="rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6">
						<InfinityIcon
							className="mb-3 h-5 w-5 text-(--brand-color)"
							aria-hidden="true"
						/>
						<h3 className="m-0 text-base font-semibold text-(--text-primary)">
							Free unlimited batch
						</h3>
						<p className="mt-1.5 mb-0 text-sm leading-relaxed text-(--text-secondary)">
							Clean one photo or dozens at once with no sign-up or paywall.
						</p>
					</div>
				</div>
			</section>

			{/* What Gets Cleaned */}
			<section aria-labelledby="cleaned-heading" className="space-y-6">
				<div className="space-y-1.5">
					<h2
						id="cleaned-heading"
						className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
					>
						What gets cleaned
					</h2>
					<p className="m-0 text-sm text-(--text-secondary)">
						Everything hidden inside the file container is removed cleanly
						before you share.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					{WHAT_GETS_CLEANED.map((item) => {
						const Icon = item.icon;
						return (
							<div
								key={item.title}
								className="flex items-start gap-3.5 rounded-2xl border border-(--border-color) bg-(--bg-card) p-5"
							>
								<span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--bg-surface) text-(--brand-color)">
									<Icon className="h-4 w-4" aria-hidden="true" />
								</span>
								<div className="space-y-1">
									<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
										{item.title}
									</h3>
									<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
										{item.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			{/* Honest Transparency Note */}
			<section
				aria-label="Transparency note on metadata versus pixel watermarks"
				className="flex flex-col justify-between gap-4 rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6 sm:flex-row sm:items-center"
			>
				<div className="max-w-2xl space-y-1">
					<h2 className="m-0 text-sm font-semibold text-(--text-primary)">
						Good to know: file data vs. invisible pixel watermarks
					</h2>
					<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
						SynthIDClear removes all hidden file data (AI creator tags, saved
						prompts, GPS location, and camera info). Invisible pixel watermarks
						such as Google SynthID live inside the image pixels themselves and
						are not removed by metadata cleaning.
					</p>
				</div>
				<Link
					to="/how-it-works"
					className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
				>
					How it works
					<ArrowRight className="h-4 w-4" aria-hidden="true" />
				</Link>
			</section>

			{/* More Tools */}
			<section aria-labelledby="more-tools-heading" className="space-y-5">
				<h2
					id="more-tools-heading"
					className="m-0 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)"
				>
					More tools
				</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{MORE_TOOLS.map((tool) => (
						<Link
							key={tool.to}
							to={tool.to}
							className="group flex flex-col justify-between gap-2 rounded-xl border border-(--border-color) bg-(--bg-card) p-4 text-(--text-primary) no-underline hover:border-(--text-primary)"
						>
							<div className="space-y-1">
								<span className="block text-sm font-semibold text-(--text-primary) group-hover:text-(--brand-color)">
									{tool.title}
								</span>
								<span className="block text-xs text-(--text-secondary)">
									{tool.subtitle}
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

			{/* Platform Guides */}
			<section aria-labelledby="platform-guides-heading" className="space-y-5">
				<h2
					id="platform-guides-heading"
					className="m-0 text-xl font-semibold tracking-[-0.02em] text-(--text-primary)"
				>
					Platform guides
				</h2>
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
