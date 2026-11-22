import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const PATH = "/remove-gps-from-photo";

const GPS_FAQS: readonly FaqItem[] = [
	{
		question: "Can someone find my home address from a photo I send?",
		answer:
			"Yes. Smartphones embed exact latitude, longitude, and altitude coordinates inside EXIF headers by default. When you share original files via email, AirDrop, iMessage, Google Drive, marketplace listings, or forums that do not strip metadata, anyone can read those coordinates and pinpoint the address on a map.",
	},
	{
		question: "Does this also remove GPS location from iPhone videos?",
		answer:
			"Yes. iPhone MOV and MP4 videos store ISO 6709 GPS coordinates inside QuickTime ©xyz and location metadata boxes. SynthIDClear detects and removes those coordinates losslessly without re-encoding the video.",
	},
	{
		question: "How can I check if my photo actually contains GPS coordinates?",
		answer:
			"Drop the file above. Before you even click Clean, SynthIDClear scans the file on your device and flags any detected GPS coordinates in plain English, plus lets you inspect the raw GPSLatitude and GPSLongitude entries.",
	},
	{
		question: "Are my private photos uploaded anywhere to remove GPS?",
		answer:
			"Never. Uploading personal geotagged photos to an unknown server defeats the point of privacy. SynthIDClear runs 100% locally in your browser — you can even turn off Wi-Fi after loading the page.",
	},
];

const GPS_LOCATIONS = [
	{
		title: "Smartphone JPEG & HEIC photos",
		body: "Stored in the EXIF GPS IFD block (GPSLatitude, GPSLongitude, GPSAltitude, and capture timestamps).",
	},
	{
		title: "iPhone & Android MOV / MP4 videos",
		body: "Stored in QuickTime metadata atoms (©xyz, com.apple.quicktime.location.ISO6709) and 3GPP loci boxes.",
	},
	{
		title: "Camera & editing sidecar tags",
		body: "Location fields copied into XMP or IPTC headers by photo managers, Lightroom, or cloud backups.",
	},
] as const;

export const Route = createFileRoute("/remove-gps-from-photo")({
	head: () =>
		buildRouteHead({
			title: "Remove GPS from Photos & Videos Privately Online | SynthIDClear",
			description:
				"Find and delete exact GPS coordinates and location tags from JPEG, HEIC, PNG, WebP, MP4, and MOV files locally in your browser with zero uploads and zero quality loss.",
			path: PATH,
		}),
	component: RemoveGpsPage,
});

function RemoveGpsPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "All Tools", path: "/tools" },
					{ name: "Remove GPS from Photo", path: PATH },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — Private Photo & Video GPS Remover",
					description:
						"Inspect and losslessly delete GPS coordinates and location metadata from photos and videos directly in your browser.",
					path: PATH,
				})}
			/>
			<JsonLd data={buildFaqSchema(GPS_FAQS)} />

			<section className="space-y-2">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					Remove GPS Location from Photos &amp; Videos
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					Check whether your photos or videos expose exact latitude and
					longitude coordinates, then scrub all GPS and camera location metadata
					locally in your browser before sharing online.
				</p>
			</section>

			<CleanerWorkspace
				dropzoneHeading="Drop photos or videos to check & remove GPS location"
				dropzoneSubtext="Detects EXIF GPS & QuickTime video coordinates · 100% private in your browser · Zero quality loss"
			/>

			<section aria-labelledby="gps-where-heading" className="space-y-5">
				<div className="space-y-1.5">
					<h2
						id="gps-where-heading"
						className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
					>
						Where GPS location hides in media files
					</h2>
					<p className="m-0 max-w-2xl text-sm text-(--text-secondary)">
						Location tags live in different binary blocks depending on whether
						you shoot a JPEG, an iPhone HEIC photo, or a video clip.
					</p>
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					{GPS_LOCATIONS.map((loc) => (
						<div
							key={loc.title}
							className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4"
						>
							<h3 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-(--text-primary)">
								<MapPin
									className="h-3.5 w-3.5 shrink-0 text-(--brand-color)"
									aria-hidden="true"
								/>
								{loc.title}
							</h3>
							<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
								{loc.body}
							</p>
						</div>
					))}
				</div>

				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
					<Link
						to="/heic-metadata-remover"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						iPhone HEIC Metadata Remover
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to="/strip-exif-online"
						className="inline-flex items-center gap-1 font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Full EXIF Cleaner
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
			</section>

			<FaqAccordion
				heading="Common questions"
				items={GPS_FAQS}
				className="mt-0"
			/>
		</div>
	);
}
