import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const EXIF_FAQS: readonly FaqItem[] = [
	{
		question: "What personal data is hidden inside EXIF headers?",
		answer:
			"EXIF headers often store exact GPS latitude and longitude coordinates, capture timestamps, phone or camera model, serial numbers, and editing software names.",
	},
	{
		question: "Will stripping EXIF wash out my iPhone or Display P3 colors?",
		answer:
			"Not with SynthIDClear. Our default cleaner strips EXIF and GPS data while keeping your original color profile intact.",
	},
	{
		question: "Is it safe to clean private photos here?",
		answer:
			"Yes. Your photos never leave your device — all cleaning runs locally inside your browser.",
	},
];

export const Route = createFileRoute("/strip-exif-online")({
	head: () =>
		buildRouteHead({
			title: "EXIF Cleaner: Remove Photo EXIF (No Upload) | SynthIDClear",
			description:
				"Scrub EXIF camera data, serial numbers, timestamps, XMP & GPS from JPEG, PNG, WebP, HEIC & AVIF photos locally in your browser with original colors kept.",
			path: "/strip-exif-online",
		}),
	component: StripExifPage,
});

function StripExifPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "Remove EXIF & GPS", path: "/strip-exif-online" },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — Private EXIF & GPS Scrubber",
					description:
						"Losslessly remove EXIF, GPS location, and camera metadata from images directly in the browser.",
					path: "/strip-exif-online",
				})}
			/>
			<JsonLd data={buildFaqSchema(EXIF_FAQS)} />

			<section className="mb-8 space-y-2">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					Remove EXIF &amp; GPS Location Online
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					Scrub GPS coordinates, camera serial numbers, and timestamps from your
					photos in batches without uploading them or losing image quality.
				</p>
			</section>

			<CleanerWorkspace
				dropzoneHeading="Drop JPEG, HEIC, PNG, WebP, or AVIF photos to scrub EXIF & GPS"
				dropzoneSubtext="Removes camera model, timestamps, GPS & XMP locally · Display P3 / sRGB colors kept"
			/>

			<section aria-labelledby="exif-what-heading" className="mt-12 space-y-4">
				<h2
					id="exif-what-heading"
					className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
				>
					What EXIF &amp; XMP cleaning strips from your photos
				</h2>
				<div className="grid gap-3 md:grid-cols-3">
					<div className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							Device &amp; lens fingerprints
						</h3>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Phone or camera make and model, lens specs, serial numbers,
							exposure settings, and software versions.
						</p>
					</div>
					<div className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							GPS &amp; capture timestamps
						</h3>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Exact latitude, longitude, altitude, and date/time stamps embedded
							automatically by iPhone, Android, and DSLR cameras.
						</p>
					</div>
					<div className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							XMP &amp; IPTC edit history
						</h3>
						<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
							Adobe Lightroom / Photoshop XMP packets, author credits, and AI
							source tags — while preserving your ICC color profile.
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
					<Link
						to="/remove-gps-from-photo"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Remove GPS from Photos &amp; Videos
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to="/heic-metadata-remover"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Lossless iPhone HEIC Metadata Remover
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
			</section>

			<FaqAccordion heading="Common questions" items={EXIF_FAQS} />
		</div>
	);
}
