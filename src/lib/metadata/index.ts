import { parseIsobmffMetadata, stripIsobmffLossless } from "./isobmff";
import { parseJpegMetadata, stripJpegLossless } from "./jpeg";
import { parseMp4Metadata, stripMp4Lossless } from "./mp4";
import { parsePngMetadata, stripPngLossless } from "./png";
import type {
	CleanOptions,
	CleanResult,
	ParseResult,
	StripScope,
} from "./types";
import {
	detectImageFormat,
	formatToMime,
	isIsobmffVideoFormat,
	isMediabunnyMediaFormat,
	mimeToExtension,
} from "./utils";
import { parseWebpMetadata, stripWebpLossless } from "./webp";

export { analyzeCreatorImpact } from "./impact";
export { parseIsobmffMetadata, stripIsobmffLossless } from "./isobmff";
export { parseJpegMetadata, stripJpegLossless } from "./jpeg";
export { parseMp4Metadata, stripMp4Lossless } from "./mp4";
export { parsePngMetadata, stripPngLossless } from "./png";
export { createSampleAiImageFile } from "./sample";
export * from "./types";
export {
	categoryLabel,
	detectImageFormat,
	formatToMime,
	isAudioFormat,
	isIsobmffVideoFormat,
	isMediabunnyMediaFormat,
	isPdfFormat,
	isVideoFormat,
	mimeToExtension,
} from "./utils";
export { parseWebpMetadata, stripWebpLossless } from "./webp";

export async function parseImageMetadata(
	buffer: ArrayBuffer,
): Promise<ParseResult> {
	const bytes = new Uint8Array(buffer);
	const format = detectImageFormat(bytes);

	if (format === "png") {
		return parsePngMetadata(bytes);
	}
	if (format === "jpeg") {
		return parseJpegMetadata(bytes);
	}
	if (format === "webp") {
		return parseWebpMetadata(bytes);
	}
	if (format === "heic" || format === "avif") {
		return parseIsobmffMetadata(bytes);
	}

	return {
		format: "unknown",
		mimeType: "application/octet-stream",
		width: null,
		height: null,
		byteLength: bytes.byteLength,
		hasIccProfile: false,
		iccProfileName: null,
		entries: [],
		aiFlagCount: 0,
		strippableCount: 0,
		parseWarnings: [
			"Unsupported file signature. Supported formats: PNG, JPEG, WebP, HEIC, AVIF, MP4, MOV, PDF.",
		],
	};
}

export async function cleanImageLossless(
	buffer: ArrayBuffer,
	preserveIcc: boolean,
	stripScope: StripScope = "all",
): Promise<CleanResult> {
	const bytes = new Uint8Array(buffer);
	const format = detectImageFormat(bytes);

	let stripResult: {
		bytes: Uint8Array;
		removedSegments: string[];
		iccPreserved: boolean;
	};

	if (format === "png") {
		stripResult = await stripPngLossless(bytes, preserveIcc, stripScope);
	} else if (format === "jpeg") {
		stripResult = stripJpegLossless(bytes, preserveIcc, stripScope);
	} else if (format === "webp") {
		stripResult = stripWebpLossless(bytes, preserveIcc, stripScope);
	} else if (format === "heic" || format === "avif") {
		stripResult = stripIsobmffLossless(bytes, preserveIcc, stripScope);
	} else {
		throw new Error(
			"Unsupported image format for lossless stripping. Use PNG, JPEG, WebP, HEIC, or AVIF.",
		);
	}

	const cleanedBuffer = stripResult.bytes.buffer.slice(
		stripResult.bytes.byteOffset,
		stripResult.bytes.byteOffset + stripResult.bytes.byteLength,
	) as ArrayBuffer;

	const verification = await parseImageMetadata(cleanedBuffer);
	const outputMimeType = formatToMime(format);

	return {
		cleanedBuffer,
		outputMimeType,
		outputExtension: mimeToExtension(outputMimeType),
		modeUsed: "lossless",
		stripScope,
		originalSize: buffer.byteLength,
		cleanedSize: cleanedBuffer.byteLength,
		iccPreserved: stripResult.iccPreserved,
		removedSegments: stripResult.removedSegments,
		verification,
	};
}

export async function cleanImageDeep(
	buffer: ArrayBuffer,
	options: CleanOptions,
): Promise<CleanResult> {
	const bytes = new Uint8Array(buffer);
	const sourceFormat = detectImageFormat(bytes);
	const sourceMime = formatToMime(sourceFormat);
	// Canvas encoders do not output HEIC or AVIF reliably across browsers; default to PNG when "original" is chosen
	const targetMime =
		options.outputFormat === "original"
			? sourceMime === "application/octet-stream" ||
				sourceMime === "image/heic" ||
				sourceMime === "image/avif"
				? "image/png"
				: sourceMime
			: options.outputFormat;

	const sourceBlob = new Blob([bytes], { type: sourceMime });
	const quality =
		targetMime === "image/png"
			? undefined
			: Math.min(1, Math.max(0.6, options.quality));

	let outBlob: Blob;

	if (
		typeof createImageBitmap !== "undefined" &&
		typeof OffscreenCanvas !== "undefined"
	) {
		const bitmap = await createImageBitmap(sourceBlob);
		const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		try {
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				throw new Error("Could not initialize 2D context on OffscreenCanvas.");
			}
			ctx.drawImage(bitmap, 0, 0);
			outBlob = await canvas.convertToBlob({
				type: targetMime,
				quality,
			});
		} finally {
			bitmap.close();
			canvas.width = 0;
			canvas.height = 0;
		}
	} else if (typeof document !== "undefined") {
		const url = URL.createObjectURL(sourceBlob);
		const canvas = document.createElement("canvas");
		try {
			const img = await new Promise<HTMLImageElement>((resolve, reject) => {
				const image = new Image();
				image.onload = () => resolve(image);
				image.onerror = () =>
					reject(new Error("Failed to decode image for Deep Clean."));
				image.src = url;
			});
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				throw new Error("Could not initialize 2D canvas context.");
			}
			ctx.drawImage(img, 0, 0);
			const blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, targetMime, quality),
			);
			if (!blob) {
				throw new Error("Canvas re-encoding failed to produce an output blob.");
			}
			outBlob = blob;
		} finally {
			URL.revokeObjectURL(url);
			canvas.width = 0;
			canvas.height = 0;
		}
	} else {
		throw new Error("No Canvas API available in this runtime for Deep Clean.");
	}

	const rawReencoded = await outBlob.arrayBuffer();
	const postStripped = await cleanImageLossless(rawReencoded, false, "all");

	return {
		cleanedBuffer: postStripped.cleanedBuffer,
		outputMimeType: outBlob.type || targetMime,
		outputExtension: mimeToExtension(outBlob.type || targetMime),
		modeUsed: "deep",
		stripScope: "all",
		originalSize: buffer.byteLength,
		cleanedSize: postStripped.cleanedSize,
		iccPreserved: false,
		removedSegments: ["Full Pixel Stream Re-encode"],
		verification: postStripped.verification,
	};
}

export async function cleanImageBuffer(
	buffer: ArrayBuffer,
	options: CleanOptions,
): Promise<CleanResult> {
	if (options.mode === "lossless") {
		return cleanImageLossless(buffer, options.preserveIcc, options.stripScope);
	}
	return cleanImageDeep(buffer, options);
}

export async function parseMediaFile(file: Blob): Promise<ParseResult> {
	const headBuf = await file.slice(0, 1024).arrayBuffer();
	const format = detectImageFormat(new Uint8Array(headBuf));
	if (isIsobmffVideoFormat(format)) {
		return parseMp4Metadata(file);
	}
	if (isMediabunnyMediaFormat(format)) {
		const { parseMediabunnyMetadata } = await import("./mediabunnyMedia");
		return parseMediabunnyMetadata(file, format);
	}
	const buffer = await file.arrayBuffer();
	return parseImageMetadata(buffer);
}

export async function cleanMediaFile(
	file: Blob,
	options: CleanOptions,
): Promise<CleanResult> {
	const headBuf = await file.slice(0, 1024).arrayBuffer();
	const format = detectImageFormat(new Uint8Array(headBuf));
	if (isIsobmffVideoFormat(format)) {
		if (options.mode === "deep") {
			const { stripMediabunnyMetadata } = await import("./mediabunnyMedia");
			return stripMediabunnyMetadata(file, options);
		}
		return stripMp4Lossless(file, options.stripScope);
	}
	if (isMediabunnyMediaFormat(format)) {
		const { stripMediabunnyMetadata } = await import("./mediabunnyMedia");
		return stripMediabunnyMetadata(file, options);
	}
	const buffer = await file.arrayBuffer();
	return cleanImageBuffer(buffer, options);
}
