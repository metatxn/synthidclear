/**
 * Extracts a lightweight preview thumbnail from the first decodable video frame
 * using Mediabunny's CanvasSink without loading the entire video into RAM.
 */
export async function extractVideoThumbnailUrl(
	file: Blob,
	maxWidth = 144,
): Promise<string | null> {
	if (typeof window === "undefined" || typeof VideoDecoder === "undefined") {
		return null;
	}
	try {
		const { BlobSource, CanvasSink, Input, MATROSKA, MP4, QTFF, WEBM } =
			await import("mediabunny");
		const input = new Input({
			formats: [MP4, QTFF, WEBM, MATROSKA],
			source: new BlobSource(file),
		});
		try {
			const videoTrack = await input.getPrimaryVideoTrack();
			if (!videoTrack || !(await videoTrack.canDecode())) {
				return null;
			}
			const firstTs = await videoTrack.getFirstTimestamp().catch(() => 0);
			const sink = new CanvasSink(videoTrack, {
				width: maxWidth,
				poolSize: 1,
			});
			const wrapped = await sink.getCanvas(Math.max(0, firstTs));
			if (!wrapped) return null;

			const canvas = wrapped.canvas;
			let blob: Blob | null = null;
			if (
				"convertToBlob" in canvas &&
				typeof canvas.convertToBlob === "function"
			) {
				blob = await canvas.convertToBlob({
					type: "image/jpeg",
					quality: 0.78,
				});
			} else if ("toBlob" in canvas && typeof canvas.toBlob === "function") {
				blob = await new Promise<Blob | null>((resolve) =>
					canvas.toBlob(resolve, "image/jpeg", 0.78),
				);
			}
			return blob ? URL.createObjectURL(blob) : null;
		} finally {
			input.dispose();
		}
	} catch {
		return null;
	}
}
