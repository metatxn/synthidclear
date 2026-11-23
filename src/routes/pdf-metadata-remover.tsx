import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Info } from "lucide-react";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import { PDF_ACCEPT } from "#/lib/format";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const PATH = "/pdf-metadata-remover";

const PDF_FAQS: readonly FaqItem[] = [
	{
		question: "What hidden metadata is stored inside a PDF document?",
		answer:
			"PDFs routinely store a Document Info dictionary (Author, Title, Subject, Keywords, Creator app, PDF Producer, CreationDate, ModDate, and custom fields), an embedded XMP XML metadata stream (written by Word, Google Docs, Adobe Acrobat, Illustrator, InDesign, and Canva), and application-specific PieceInfo blocks.",
	},
	{
		question: "Are my confidential PDFs uploaded to a server?",
		answer:
			"Never. All PDF inspection and metadata removal runs 100% locally inside your browser. Sensitive resumes, contracts, legal filings, tax forms, and blind-review manuscripts never leave your device.",
	},
	{
		question: "Will removing PDF metadata change text, layout, or links?",
		answer:
			"No. SynthIDClear removes only the document metadata dictionaries and XMP streams (/Info, /Metadata, /PieceInfo) without rasterizing pages or modifying fonts, vector graphics, bookmarks, or selectable text.",
	},
	{
		question: "Can I clean a password-protected or encrypted PDF?",
		answer:
			"No. Encrypted PDFs cannot be modified without unlocking them first. Remove the password protection locally, then drop the unlocked PDF here to scrub its metadata.",
	},
];

const PDF_LAYERS = [
	{
		title: "Document Info dictionary (/Info)",
		body: "Strips Author, Creator, Producer, Title, Subject, Keywords, CreationDate, ModDate, and custom keys that leak your name, OS, or software version.",
	},
	{
		title: "Embedded XMP streams (/Metadata)",
		body: "Removes catalog-level and page-level XMP XML streams containing edit history, document IDs, AI provenance tags, and Adobe/Office tool signatures.",
	},
	{
		title: "Private app data (/PieceInfo)",
		body: "Deletes private application blocks left behind by desktop layout tools like Adobe Illustrator, Photoshop, and InDesign.",
	},
] as const;

export const Route = createFileRoute("/pdf-metadata-remover")({
	head: () =>
		buildRouteHead({
			title: "PDF Metadata Remover — Free, Private & Local | SynthIDClear",
			description:
				"Remove hidden PDF Author, Title, Producer, dates, XMP & PieceInfo locally in your browser. Zero uploads, layout untouched, verified 0 metadata remaining.",
			path: PATH,
		}),
	component: PdfMetadataRemoverPage,
});

function PdfMetadataRemoverPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "All Tools", path: "/tools" },
					{ name: "PDF Metadata Remover", path: PATH },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — Private PDF Metadata Remover",
					description:
						"Client-side PDF metadata cleaner that removes Document Info, Author, Producer, timestamps, XMP streams, and PieceInfo locally in your browser.",
					path: PATH,
				})}
			/>
			<JsonLd data={buildFaqSchema(PDF_FAQS)} />

			<section className="space-y-2">
				<h1 className="m-0 text-3xl font-semibold tracking-[-0.03em] text-(--text-primary) sm:text-4xl">
					PDF Metadata Remover
				</h1>
				<p className="m-0 max-w-2xl text-base leading-relaxed text-(--text-secondary)">
					Inspect and delete hidden Author names, Creator/Producer software
					tags, creation dates, XMP edit history, and private app data from PDF
					documents right in your browser — nothing is ever uploaded.
				</p>
			</section>

			<CleanerWorkspace
				accept={PDF_ACCEPT}
				defaultInspectorOpen
				hideSampleButton
				hideScopeBanner
				dropzoneHeading="Drop PDF documents here to inspect & scrub metadata"
				dropzoneSubtext="Removes /Info, Author, timestamps, XMP & /PieceInfo locally · Text & layout stay 100% untouched"
			/>

			<section aria-labelledby="pdf-layers-heading" className="space-y-5">
				<div className="space-y-1.5">
					<h2
						id="pdf-layers-heading"
						className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
					>
						What gets cleaned from your PDF
					</h2>
					<p className="m-0 max-w-2xl text-sm text-(--text-secondary)">
						Before sending a resume, contract, pitch deck, or anonymous peer
						review manuscript, verify what metadata your editor attached and
						wipe it cleanly.
					</p>
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					{PDF_LAYERS.map((layer) => (
						<div
							key={layer.title}
							className="space-y-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) p-4"
						>
							<h3 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-(--text-primary)">
								<FileText
									className="h-3.5 w-3.5 shrink-0 text-(--brand-color)"
									aria-hidden="true"
								/>
								{layer.title}
							</h3>
							<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
								{layer.body}
							</p>
						</div>
					))}
				</div>
			</section>

			<section
				aria-labelledby="pdf-notes-heading"
				className="space-y-3 rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6"
			>
				<h2
					id="pdf-notes-heading"
					className="m-0 flex items-center gap-2 text-base font-semibold text-(--text-primary)"
				>
					<Info className="h-4 w-4 text-(--text-muted)" aria-hidden="true" />
					Good to know before sharing sensitive PDFs
				</h2>
				<p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
					SynthIDClear removes document-level and page-level metadata
					dictionaries and verifies that 0 metadata fields remain in the saved
					PDF. It does not redact visible text, annotations/comments drawn on
					pages, or EXIF inside images already embedded inside the PDF — clean
					images first if you are assembling a new PDF from raw photos.
				</p>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
					<Link
						to="/strip-exif-online"
						className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Clean Photo EXIF &amp; GPS First
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to="/ai-metadata-checker"
						className="inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
					>
						Inspect Any Media File
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
			</section>

			<FaqAccordion
				heading="Common questions"
				items={PDF_FAQS}
				className="mt-0"
			/>
		</div>
	);
}
