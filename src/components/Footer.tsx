import { Link } from "@tanstack/react-router";
import { PLATFORM_GUIDES } from "#/lib/platformGuides";
import { BrandMark } from "./BrandMark";

export function Footer() {
	return (
		<footer className="border-t border-(--border-color) bg-(--bg-surface) text-(--text-secondary)">
			<div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
				<div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1.5fr]">
					<div className="space-y-3">
						<Link
							to="/"
							className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-(--text-primary) no-underline"
						>
							<BrandMark className="h-6 w-6 shrink-0" />
							<span>SynthIDClear</span>
						</Link>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Everything runs on your device. Nothing is ever uploaded.
						</p>
					</div>

					<div>
						<h2 className="m-0 mb-3 text-xs font-semibold tracking-wide text-(--text-primary) uppercase">
							Tools
						</h2>
						<nav aria-label="Footer tools">
							<ul className="m-0 list-none space-y-2 p-0 text-sm">
								<li>
									<Link
										to="/"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Image Cleaner
									</Link>
								</li>
								<li>
									<Link
										to="/remove-c2pa-metadata"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Remove AI Tags (C2PA)
									</Link>
								</li>
								<li>
									<Link
										to="/strip-exif-online"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Remove EXIF &amp; GPS
									</Link>
								</li>
								<li>
									<Link
										to="/png-prompt-remover"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Remove PNG Prompts
									</Link>
								</li>
								<li>
									<Link
										to="/video-metadata-remover"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Video Metadata Remover
									</Link>
								</li>
							</ul>
						</nav>
					</div>

					<div>
						<h2 className="m-0 mb-3 text-xs font-semibold tracking-wide text-(--text-primary) uppercase">
							Platform guides
						</h2>
						<nav aria-label="Footer platform guides">
							<ul className="m-0 list-none space-y-2 p-0 text-sm">
								{PLATFORM_GUIDES.map((guide) => (
									<li key={guide.to}>
										<Link
											to={guide.to}
											className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
										>
											{guide.title}
										</Link>
									</li>
								))}
							</ul>
						</nav>
					</div>

					<div className="space-y-2.5">
						<h2 className="m-0 text-xs font-semibold tracking-wide text-(--text-primary) uppercase">
							What to know
						</h2>
						<p className="m-0 text-xs leading-relaxed text-(--text-secondary)">
							SynthIDClear removes all hidden file metadata (AI creator tags,
							saved prompts, GPS location, and camera info). Invisible pixel
							watermarks such as Google SynthID live inside the pixels
							themselves and are not removed by metadata cleaning.
						</p>
						<div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
							<Link
								to="/how-it-works"
								className="font-medium text-(--brand-color) no-underline hover:underline"
							>
								How it works →
							</Link>
							<Link
								to="/privacy"
								className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
							>
								Privacy
							</Link>
							<Link
								to="/terms"
								className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
							>
								Terms
							</Link>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
