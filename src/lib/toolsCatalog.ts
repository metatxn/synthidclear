export type ToolPath =
	| "/"
	| "/remove-c2pa-metadata"
	| "/ai-only-metadata-remover"
	| "/png-prompt-remover"
	| "/ai-metadata-checker"
	| "/strip-exif-online"
	| "/remove-gps-from-photo"
	| "/heic-to-jpg"
	| "/heic-metadata-remover"
	| "/pdf-metadata-remover"
	| "/video-metadata-remover"
	| "/audio-metadata-remover"
	| "/compress-video"
	| "/mute-extract-audio"
	| "/video-frame-extractor"
	| "/visible-icon-remover";

export interface ToolCatalogEntry {
	to: ToolPath;
	title: string;
	shortTitle: string;
	subtitle: string;
	category: "visual" | "ai-metadata" | "privacy" | "inspect" | "formats";
	formats: string;
}

export const TOOL_CATALOG: readonly ToolCatalogEntry[] = [
	{
		to: "/visible-icon-remover",
		title: "Visible Icon Remover",
		shortTitle: "Visible Icon Remover",
		subtitle:
			"Select a visible logo or corner mark and repair the area, plus trim, crop, rotate, or mute videos locally.",
		category: "visual",
		formats: "PNG, JPEG, WebP, AVIF, MP4, MOV, WebM, MKV",
	},
	{
		to: "/video-frame-extractor",
		title: "Clean Video Frame Extractor",
		shortTitle: "Video Frame Extractor",
		subtitle:
			"Scrub frame-by-frame and save full-resolution, metadata-free PNG, JPEG, or WebP stills.",
		category: "visual",
		formats: "MP4, MOV, WebM, MKV → PNG, JPG, WebP",
	},
	{
		to: "/remove-c2pa-metadata",
		title: "Remove AI Tags (C2PA)",
		shortTitle: "C2PA & AI Tag Remover",
		subtitle:
			"Strip C2PA Content Credentials and IPTC DigitalSourceType labels losslessly.",
		category: "ai-metadata",
		formats: "PNG, JPEG, WebP, HEIC, AVIF, MP4, MOV",
	},
	{
		to: "/ai-only-metadata-remover",
		title: "AI-Only Metadata Remover",
		shortTitle: "AI-Only Remover (Keep EXIF)",
		subtitle:
			"Delete AI tags, C2PA, and prompts while keeping camera EXIF, lens, and copyright data.",
		category: "ai-metadata",
		formats: "PNG, JPEG, WebP, HEIC, AVIF, MP4, MOV",
	},
	{
		to: "/png-prompt-remover",
		title: "PNG Prompt Remover",
		shortTitle: "PNG Prompt Remover",
		subtitle:
			"Delete Stable Diffusion prompts, seeds, and ComfyUI workflow graphs from PNG chunks.",
		category: "ai-metadata",
		formats: "PNG",
	},
	{
		to: "/ai-metadata-checker",
		title: "AI Metadata & C2PA Checker",
		shortTitle: "AI Metadata & C2PA Checker",
		subtitle:
			"Inspect hidden C2PA credentials, AI generator signatures, GPS, EXIF, and metadata size.",
		category: "inspect",
		formats: "PNG, JPEG, WebP, HEIC, AVIF, MP4, MOV",
	},
	{
		to: "/strip-exif-online",
		title: "EXIF Cleaner",
		shortTitle: "EXIF Cleaner",
		subtitle:
			"Scrub camera model, serial numbers, timestamps, XMP, and GPS while keeping colors.",
		category: "privacy",
		formats: "JPEG, PNG, WebP, HEIC, AVIF",
	},
	{
		to: "/remove-gps-from-photo",
		title: "Remove GPS from Photo",
		shortTitle: "Remove GPS from Photo",
		subtitle:
			"Find and delete exact latitude, longitude, and location tags from photos and videos.",
		category: "privacy",
		formats: "JPEG, HEIC, WebP, PNG, MP4, MOV",
	},
	{
		to: "/heic-to-jpg",
		title: "HEIC to JPG Converter",
		shortTitle: "HEIC to JPG (Clean)",
		subtitle:
			"Convert iPhone HEIC/HEIF photos to JPG, PNG, or WebP in any browser with GPS & EXIF stripped.",
		category: "formats",
		formats: "HEIC, HEIF → JPG, PNG, WebP",
	},
	{
		to: "/heic-metadata-remover",
		title: "HEIC Metadata Remover",
		shortTitle: "HEIC & AVIF Metadata Remover",
		subtitle:
			"Clean iPhone HEIC and AVIF files losslessly in any browser with Display P3 kept.",
		category: "formats",
		formats: "HEIC, AVIF",
	},
	{
		to: "/pdf-metadata-remover",
		title: "PDF Metadata Remover",
		shortTitle: "PDF Metadata Remover",
		subtitle:
			"Strip Author, Creator, Producer, dates, XMP streams, and PieceInfo from PDFs locally.",
		category: "formats",
		formats: "PDF",
	},
	{
		to: "/video-metadata-remover",
		title: "Video Metadata Remover",
		shortTitle: "Video Metadata Remover",
		subtitle:
			"Strip C2PA, GPS, QuickTime, and Matroska tags from MP4, MOV, MKV, and WebM files with zero re-encoding.",
		category: "formats",
		formats: "MP4, MOV, MKV, WebM",
	},
	{
		to: "/audio-metadata-remover",
		title: "Audio Metadata Remover",
		shortTitle: "Audio Metadata Remover",
		subtitle:
			"Strip ID3 tags, Vorbis comments, RIFF INFO, cover art, and AI audio tags losslessly in-browser.",
		category: "formats",
		formats: "MP3, WAV, FLAC, OGG, M4A, AAC",
	},
	{
		to: "/compress-video",
		title: "Clean Video Compressor & Converter",
		shortTitle: "Compress / Convert Video",
		subtitle:
			"Convert MOV, MKV, WebM, or MP4 clips to compact, metadata-free MP4 or WebM with resolution and FPS caps.",
		category: "formats",
		formats: "MP4, MOV, MKV, WebM → MP4, WebM",
	},
	{
		to: "/mute-extract-audio",
		title: "Mute Video & Extract Clean Audio",
		shortTitle: "Mute Video / Extract Audio",
		subtitle:
			"Remove background audio from videos with zero re-encoding, or extract a clean audio track.",
		category: "formats",
		formats: "MP4, MOV, MKV, WebM → Muted / M4A, OGG, WAV",
	},
] as const;
