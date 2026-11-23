export type ImageFormat =
	| "png"
	| "jpeg"
	| "webp"
	| "heic"
	| "avif"
	| "mp4"
	| "mov"
	| "webm"
	| "mkv"
	| "mp3"
	| "wav"
	| "flac"
	| "ogg"
	| "aac"
	| "m4a"
	| "pdf"
	| "unknown";

export type MediaFormat = ImageFormat;

export interface MediaTrackSummary {
	durationSeconds: number | null;
	videoCodec: string | null;
	videoCodecString: string | null;
	audioCodec: string | null;
	audioCodecString: string | null;
	frameRate: number | null;
	frameRateIsConstant: boolean | null;
	hasHdr: boolean;
	colorSpace: string | null;
	rotation: number | null;
	audioChannels: number | null;
	audioSampleRate: number | null;
	trackCount: number;
	trackNames: string[];
	hasCoverArt: boolean;
}

export type MetadataCategory =
	| "ai-provenance"
	| "document"
	| "exif"
	| "xmp"
	| "iptc"
	| "png-text"
	| "comment"
	| "timestamp"
	| "icc"
	| "trailing"
	| "other";

export interface MetadataEntry {
	id: string;
	key: string;
	value: string;
	category: MetadataCategory;
	source: string;
	byteSize: number;
	isAiFlag: boolean;
	isPreservedByDefault?: boolean;
}

export interface ParseResult {
	format: ImageFormat;
	mimeType: string;
	width: number | null;
	height: number | null;
	pageCount?: number | null;
	mediaInfo?: MediaTrackSummary | null;
	byteLength: number;
	hasIccProfile: boolean;
	iccProfileName: string | null;
	entries: MetadataEntry[];
	aiFlagCount: number;
	strippableCount: number;
	parseWarnings: string[];
}

export type CleanMode = "lossless" | "deep";

export type StripScope = "all" | "ai-only";

export type OutputFormat =
	| "original"
	| "image/png"
	| "image/jpeg"
	| "image/webp"
	| "video/mp4"
	| "video/webm";

export interface CleanOptions {
	mode: CleanMode;
	preserveIcc: boolean;
	stripScope: StripScope;
	outputFormat: OutputFormat;
	quality: number;
}

export interface StripResult {
	bytes: Uint8Array;
	removedSegments: string[];
	iccPreserved: boolean;
}

export interface CleanResult {
	cleanedBuffer: ArrayBuffer | null;
	cleanedBlob?: Blob;
	outputMimeType: string;
	outputExtension: string;
	modeUsed: CleanMode;
	stripScope: StripScope;
	originalSize: number;
	cleanedSize: number;
	iccPreserved: boolean;
	removedSegments: string[];
	verification: ParseResult;
}

export interface CreatorImpact {
	hasC2pa: boolean;
	hasIptcAiTag: boolean;
	hasSavedPrompt: boolean;
	hasGps: boolean;
	gpsSummary: string | null;
	detectedGenerator: string | null;
	warnings: string[];
}
