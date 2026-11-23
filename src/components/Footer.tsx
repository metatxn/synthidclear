import { Link } from "@tanstack/react-router";
import { PLATFORM_GUIDES } from "#/lib/platformGuides";
import { BrandMark } from "./BrandMark";

export function Footer() {
	return (
		<footer className="border-t border-(--border-color) bg-(--bg-surface) text-(--text-secondary)">
			<div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6">
				<div className="flex flex-col justify-between gap-4 border-b border-(--border-color) pb-8 sm:flex-row sm:items-start">
					<div className="max-w-md space-y-2.5">
						<Link
							to="/"
							className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-(--text-primary) no-underline"
						>
							<BrandMark className="h-6 w-6 shrink-0" />
							<span>SynthIDClear</span>
						</Link>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Inspect and remove hidden AI tags, C2PA credentials, prompts, GPS,
							and camera metadata from photos and videos locally in your browser
							with zero quality loss.
						</p>
					</div>

					<div className="max-w-sm space-y-1.5">
						<h2 className="m-0 text-xs font-semibold tracking-wide text-(--text-primary) uppercase">
							What to know
						</h2>
						<p className="m-0 text-xs leading-relaxed text-(--text-secondary)">
							Everything runs on your device — nothing is ever uploaded.
							Invisible pixel watermarks such as Google SynthID live inside the
							pixels themselves and are not removed by metadata cleaning.
						</p>
					</div>
				</div>

				<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
					<div>
						<h2 className="m-0 mb-3 text-xs font-semibold tracking-wide text-(--text-primary) uppercase">
							Remove AI metadata
						</h2>
						<nav aria-label="Footer AI metadata tools">
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
										C2PA &amp; AI Tag Remover
									</Link>
								</li>
								<li>
									<Link
										to="/ai-only-metadata-remover"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										AI-Only Remover
									</Link>
								</li>
								<li>
									<Link
										to="/png-prompt-remover"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										PNG Prompt Remover
									</Link>
								</li>
							</ul>
						</nav>
					</div>

					<div>
						<h2 className="m-0 mb-3 text-xs font-semibold tracking-wide text-(--text-primary) uppercase">
							Check &amp; privacy
						</h2>
						<nav aria-label="Footer inspection and privacy tools">
							<ul className="m-0 list-none space-y-2 p-0 text-sm">
								<li>
									<Link
										to="/ai-metadata-checker"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										AI Metadata &amp; C2PA Checker
									</Link>
								</li>
								<li>
									<Link
										to="/strip-exif-online"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										EXIF Cleaner
									</Link>
								</li>
								<li>
									<Link
										to="/remove-gps-from-photo"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Remove GPS from Photo
									</Link>
								</li>
							</ul>
						</nav>
					</div>

					<div>
						<h2 className="m-0 mb-3 text-xs font-semibold tracking-wide text-(--text-primary) uppercase">
							HEIC, PDF, audio &amp; video
						</h2>
						<nav aria-label="Footer format-specific tools">
							<ul className="m-0 list-none space-y-2 p-0 text-sm">
								<li>
									<Link
										to="/heic-to-jpg"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										HEIC to JPG
									</Link>
								</li>
								<li>
									<Link
										to="/pdf-metadata-remover"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										PDF Metadata Remover
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
								<li>
									<Link
										to="/audio-metadata-remover"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Audio Metadata Remover
									</Link>
								</li>
								<li>
									<Link
										to="/compress-video"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Clean Video Compressor
									</Link>
								</li>
								<li>
									<Link
										to="/mute-extract-audio"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Mute Video / Extract Audio
									</Link>
								</li>
								<li>
									<Link
										to="/video-frame-extractor"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Video Frame Extractor
									</Link>
								</li>
								<li className="pt-1">
									<Link
										to="/tools"
										className="font-semibold text-(--text-primary) no-underline hover:text-(--brand-color)"
									>
										All free tools →
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
								<li className="pt-1">
									<Link
										to="/guides"
										className="font-semibold text-(--text-primary) no-underline hover:text-(--brand-color)"
									>
										All guides →
									</Link>
								</li>
							</ul>
						</nav>
					</div>

					<div>
						<h2 className="m-0 mb-3 text-xs font-semibold tracking-wide text-(--text-primary) uppercase">
							Learn
						</h2>
						<nav aria-label="Footer learn and legal">
							<ul className="m-0 list-none space-y-2 p-0 text-sm">
								<li>
									<Link
										to="/ai-metadata-matrix"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										2026 AI Metadata Matrix
									</Link>
								</li>
								<li>
									<Link
										to="/advanced-media-guide"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Advanced Media Guide
									</Link>
								</li>
								<li>
									<Link
										to="/how-it-works"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										How it works
									</Link>
								</li>
								<li>
									<Link
										to="/privacy"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Privacy
									</Link>
								</li>
								<li>
									<Link
										to="/terms"
										className="text-(--text-secondary) no-underline hover:text-(--text-primary)"
									>
										Terms
									</Link>
								</li>
							</ul>
						</nav>
					</div>
				</div>
			</div>
		</footer>
	);
}
