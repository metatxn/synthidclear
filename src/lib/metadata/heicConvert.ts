import { cleanImageLossless } from "./index";
import type { CleanOptions, CleanResult } from "./types";
import { mimeToExtension } from "./utils";

export async function convertHeicBuffer(
	buffer: ArrayBuffer,
	options: CleanOptions,
): Promise<CleanResult> {
	const targetMime: "image/jpeg" | "image/png" | "image/webp" =
		options.outputFormat === "image/png" ||
		options.outputFormat === "image/webp"
			? options.outputFormat
			: "image/jpeg";

	const quality =
		targetMime === "image/png"
			? undefined
			: Math.min(1, Math.max(0.6, options.quality));

	const sourceBlob = new Blob([buffer], { type: "image/heic" });
	const { heicTo } = await import("heic-to/csp");

	const outBlob = await heicTo({
		blob: sourceBlob,
		type: targetMime,
		quality,
	});

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
		removedSegments: ["Converted HEIC via libheif + Stripped All Metadata"],
		verification: postStripped.verification,
	};
}
