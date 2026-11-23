import type {
	ConversionOptions,
	CropRectangle,
	Conversion as MediabunnyConversion,
	Rotation,
	StreamTargetChunk,
} from "mediabunny";
import {
	clamp,
	getRepairContext,
	type IconPosition,
	regionAtTime,
	repairRegion,
} from "./iconRemoval";

const MIN_VIDEO_BITRATE = 1_000_000;
const MAX_VIDEO_BITRATE = 100_000_000;
// Slight headroom above the original video track's bitrate so re-encoding
// preserves crisp visual quality and keeps output size close to the source.
const BITRATE_HEADROOM = 1.1;

export interface IconVideoExportOptions {
	/** Strip descriptive container tags and omit creationTime (default: true). */
	stripMetadata?: boolean;
	/** Discard audio tracks from output video (default: false). */
	muteAudio?: boolean;
	/** Optional start/end trim range in seconds. */
	trim?: {
		start?: number;
		end?: number;
	};
	/** Optional display-space crop rectangle applied before inpainting. */
	crop?: CropRectangle;
	/** Optional additional clockwise rotation in degrees. */
	rotate?: Rotation;
	/** Optional horizontal flip. */
	flip?: boolean;
	/** Optional FileSystemFileHandle for direct-to-disk streaming on large exports. */
	saveFileHandle?: FileSystemFileHandle;
}

export interface IconVideoExportResult {
	blob: Blob | null;
	mimeType: string;
	extension: "mp4" | "mov" | "webm" | "mkv";
	streamedToDisk: boolean;
}

export function supportsDirectDiskSave(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof (
			window as Window & {
				showSaveFilePicker?: unknown;
			}
		).showSaveFilePicker === "function"
	);
}

export async function pickVideoSaveHandle(
	suggestedName: string,
	extension: string,
	mimeType: string,
): Promise<FileSystemFileHandle | null> {
	const picker = (
		window as Window & {
			showSaveFilePicker?: (options?: {
				suggestedName?: string;
				types?: Array<{
					description?: string;
					accept: Record<string, string[]>;
				}>;
			}) => Promise<FileSystemFileHandle>;
		}
	).showSaveFilePicker;
	if (!picker) return null;

	const cleanExt = extension.replace(/^\./, "");
	try {
		return await picker({
			suggestedName,
			types: [
				{
					description: `${cleanExt.toUpperCase()} Video`,
					accept: { [mimeType]: [`.${cleanExt}`] },
				},
			],
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			return null;
		}
		throw error;
	}
}

export async function runIconVideoConversion(
	file: File,
	positions: readonly IconPosition[],
	signal: AbortSignal,
	onProgress: (progress: number) => void,
	options: IconVideoExportOptions = {},
): Promise<IconVideoExportResult> {
	signal.throwIfAborted();

	const stripMetadata = options.stripMetadata !== false;
	const muteAudio = Boolean(options.muteAudio);
	const hasVisualEdits =
		positions.length > 0 ||
		Boolean(options.crop) ||
		Boolean(options.rotate) ||
		Boolean(options.flip);

	if (
		hasVisualEdits &&
		(typeof VideoDecoder === "undefined" ||
			typeof VideoEncoder === "undefined" ||
			typeof VideoFrame === "undefined")
	) {
		throw new Error(
			"Your browser does not support WebCodecs video export. Try a recent version of Chrome, Edge, Safari, or Firefox.",
		);
	}

	const {
		BlobSource,
		BufferTarget,
		Conversion,
		ConversionCanceledError,
		getFirstEncodableVideoCodec,
		Input,
		MATROSKA,
		MatroskaInputFormat,
		MkvOutputFormat,
		MP4,
		MovOutputFormat,
		Mp4OutputFormat,
		Output,
		QTFF,
		Quality,
		QuickTimeInputFormat,
		StreamTarget,
		WEBM,
		WebMInputFormat,
		WebMOutputFormat,
	} = await import("mediabunny");

	signal.throwIfAborted();

	const input = new Input({
		formats: [MP4, QTFF, WEBM, MATROSKA],
		source: new BlobSource(file),
	});

	let activeConversion: MediabunnyConversion | undefined;
	const onAbort = () => {
		void activeConversion?.cancel();
	};
	signal.addEventListener("abort", onAbort, { once: true });

	let writableStream: FileSystemWritableFileStream | null = null;

	try {
		const inputFormat = await input.getFormat();
		const videoTrack = await input.getPrimaryVideoTrack();
		if (!videoTrack) {
			throw new Error("No playable video track was found in this file.");
		}
		if (hasVisualEdits && !(await videoTrack.canDecode())) {
			throw new Error("Your browser cannot decode this video codec.");
		}

		const displayWidth = await videoTrack.getDisplayWidth();
		const displayHeight = await videoTrack.getDisplayHeight();
		const rotated90 = options.rotate === 90 || options.rotate === 270;
		const postRotateWidth = rotated90 ? displayHeight : displayWidth;
		const postRotateHeight = rotated90 ? displayWidth : displayHeight;

		const outWidth = options.crop
			? clamp(Math.round(options.crop.width), 2, postRotateWidth)
			: postRotateWidth;
		const outHeight = options.crop
			? clamp(Math.round(options.crop.height), 2, postRotateHeight)
			: postRotateHeight;

		const outputFormat =
			inputFormat instanceof WebMInputFormat
				? new WebMOutputFormat()
				: inputFormat instanceof MatroskaInputFormat
					? new MkvOutputFormat()
					: inputFormat instanceof QuickTimeInputFormat
						? new MovOutputFormat({
								fastStart: options.saveFileHandle ? false : "in-memory",
							})
						: new Mp4OutputFormat({
								fastStart: options.saveFileHandle ? false : "in-memory",
							});

		const outputExtension: "mp4" | "mov" | "webm" | "mkv" =
			outputFormat instanceof WebMOutputFormat
				? "webm"
				: outputFormat instanceof MkvOutputFormat
					? "mkv"
					: outputFormat instanceof MovOutputFormat
						? "mov"
						: "mp4";

		let target:
			| InstanceType<typeof BufferTarget>
			| InstanceType<typeof StreamTarget>;
		let bufferTarget: InstanceType<typeof BufferTarget> | null = null;
		if (options.saveFileHandle) {
			writableStream = await options.saveFileHandle.createWritable();
			target = new StreamTarget(
				writableStream as unknown as WritableStream<StreamTargetChunk>,
				{ chunked: true },
			);
		} else {
			bufferTarget = new BufferTarget();
			target = bufferTarget;
		}

		const output = new Output({ format: outputFormat, target });

		const conversionConfig: ConversionOptions = {
			input,
			output,
			tracks: "primary",
			showWarnings: false,
			...(stripMetadata ? { tags: { creationTime: null } } : {}),
			...(muteAudio ? { audio: { discard: true } } : {}),
			...(options.trim &&
			(options.trim.start !== undefined || options.trim.end !== undefined)
				? { trim: options.trim }
				: {}),
		};

		let repairCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;

		if (hasVisualEdits) {
			const [packetStats, metadataBitrate, duration, sourceCodec] =
				await Promise.all([
					videoTrack.computePacketStats(),
					videoTrack.getAverageBitrate(),
					videoTrack.computeDuration(),
					videoTrack.getCodec(),
				]);

			signal.throwIfAborted();

			const fallbackFileBitrate =
				duration > 0 ? Math.round((file.size * 8) / duration) : 0;
			const sourceBitrate =
				Number.isFinite(packetStats.averageBitrate) &&
				packetStats.averageBitrate > 0
					? packetStats.averageBitrate
					: metadataBitrate && metadataBitrate > 0
						? metadataBitrate
						: fallbackFileBitrate;

			const targetBitrate = clamp(
				Math.round(
					(sourceBitrate || outWidth * outHeight * 6) * BITRATE_HEADROOM,
				),
				MIN_VIDEO_BITRATE,
				MAX_VIDEO_BITRATE,
			);
			const matchedQuality = new Quality({
				bitrate: targetBitrate,
				bitrateMode: "variable",
			});

			const supportedCodecs = outputFormat.getSupportedVideoCodecs();
			const preferredCodecs =
				sourceCodec && supportedCodecs.includes(sourceCodec)
					? [
							sourceCodec,
							...supportedCodecs.filter(
								(candidate) => candidate !== sourceCodec,
							),
						]
					: supportedCodecs;

			let quality = matchedQuality;
			let codec = await getFirstEncodableVideoCodec(preferredCodecs, {
				width: outWidth,
				height: outHeight,
				quality,
			});
			if (!codec) {
				quality = new Quality("very-high");
				codec = await getFirstEncodableVideoCodec(preferredCodecs, {
					width: outWidth,
					height: outHeight,
					quality,
				});
			}
			if (!codec) {
				throw new Error(
					"Your browser cannot encode this video resolution or format.",
				);
			}

			if (positions.length > 0) {
				repairCanvas =
					typeof OffscreenCanvas !== "undefined"
						? new OffscreenCanvas(outWidth, outHeight)
						: document.createElement("canvas");
				repairCanvas.width = outWidth;
				repairCanvas.height = outHeight;
				const context = getRepairContext(repairCanvas);
				const cropOffsetX = options.crop ? Math.round(options.crop.left) : 0;
				const cropOffsetY = options.crop ? Math.round(options.crop.top) : 0;
				const canvasRef = repairCanvas;

				conversionConfig.video = {
					codec,
					quality,
					rotate: options.rotate,
					flip: options.flip,
					crop: options.crop,
					allowTransformationMetadata: false,
					processedWidth: outWidth,
					processedHeight: outHeight,
					process: (sample) => {
						context.clearRect(0, 0, outWidth, outHeight);
						sample.draw(context, 0, 0, outWidth, outHeight);
						const rawRegion = regionAtTime(positions, sample.timestamp);
						const shiftedRegion = rawRegion
							? {
									x: rawRegion.x - cropOffsetX,
									y: rawRegion.y - cropOffsetY,
									width: rawRegion.width,
									height: rawRegion.height,
								}
							: undefined;
						repairRegion(context, shiftedRegion);
						return canvasRef;
					},
				};
			} else {
				conversionConfig.video = {
					codec,
					quality,
					rotate: options.rotate,
					flip: options.flip,
					crop: options.crop,
					allowTransformationMetadata: false,
					forceTranscode: Boolean(
						options.crop || options.rotate || options.flip,
					),
				};
			}
		} else {
			// Pure trim / mute / metadata-strip without pixel edits: copy streams losslessly when possible
			conversionConfig.copy = {
				mode: "preferred",
				shiftTolerance: Infinity,
			};
		}

		const conversion = await Conversion.init(conversionConfig);

		if (!conversion.isValid) {
			throw new Error(
				"This video format or codec could not be prepared for export.",
			);
		}

		activeConversion = conversion;
		signal.throwIfAborted();

		let lastProgress = 0;
		conversion.onProgress = (ratio) => {
			const percent = Math.min(99, Math.max(0, Math.floor(ratio * 100)));
			if (percent !== lastProgress) {
				lastProgress = percent;
				onProgress(percent);
			}
		};

		try {
			await conversion.execute();
		} catch (error) {
			if (writableStream) {
				await writableStream.abort().catch(() => {});
				writableStream = null;
			}
			if (error instanceof ConversionCanceledError || signal.aborted) {
				throw signal.reason ?? error;
			}
			throw error;
		}

		if (repairCanvas) {
			repairCanvas.width = 0;
			repairCanvas.height = 0;
		}

		onProgress(100);

		if (options.saveFileHandle) {
			return {
				blob: null,
				mimeType: outputFormat.mimeType,
				extension: outputExtension,
				streamedToDisk: true,
			};
		}

		if (!bufferTarget?.buffer || bufferTarget.buffer.byteLength === 0) {
			throw new Error("The video export produced an empty file.");
		}

		return {
			blob: new Blob([bufferTarget.buffer], { type: outputFormat.mimeType }),
			mimeType: outputFormat.mimeType,
			extension: outputExtension,
			streamedToDisk: false,
		};
	} finally {
		signal.removeEventListener("abort", onAbort);
		input.dispose();
	}
}

export async function exportIconVideo(
	file: File,
	positions: readonly IconPosition[],
	signal: AbortSignal,
	onProgress: (progress: number) => void,
	options: IconVideoExportOptions = {},
): Promise<IconVideoExportResult> {
	signal.throwIfAborted();

	const canUseWorker =
		typeof window !== "undefined" &&
		typeof Worker !== "undefined" &&
		typeof OffscreenCanvas !== "undefined";

	if (!canUseWorker) {
		return runIconVideoConversion(file, positions, signal, onProgress, options);
	}

	return new Promise<IconVideoExportResult>((resolve, reject) => {
		let worker: Worker | null = null;
		let settled = false;

		const cleanup = () => {
			signal.removeEventListener("abort", handleAbort);
			if (worker) {
				worker.terminate();
				worker = null;
			}
		};

		const handleAbort = () => {
			if (settled) return;
			settled = true;
			worker?.postMessage({ type: "cancel" });
			cleanup();
			reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
		};

		signal.addEventListener("abort", handleAbort, { once: true });

		try {
			worker = new Worker(
				new URL("../workers/iconVideoExport.worker.ts", import.meta.url),
				{ type: "module" },
			);
		} catch {
			cleanup();
			runIconVideoConversion(file, positions, signal, onProgress, options).then(
				resolve,
				reject,
			);
			return;
		}

		worker.onmessage = (event: MessageEvent) => {
			if (settled) return;
			const msg = event.data as
				| { type: "progress"; progress: number }
				| {
						type: "done";
						buffer: ArrayBuffer | null;
						mimeType: string;
						extension: "mp4" | "mov" | "webm" | "mkv";
						streamedToDisk: boolean;
				  }
				| { type: "error"; error: string };

			if (msg.type === "progress") {
				onProgress(msg.progress);
			} else if (msg.type === "done") {
				settled = true;
				cleanup();
				resolve({
					blob: msg.buffer
						? new Blob([msg.buffer], { type: msg.mimeType })
						: null,
					mimeType: msg.mimeType,
					extension: msg.extension,
					streamedToDisk: msg.streamedToDisk,
				});
			} else if (msg.type === "error") {
				settled = true;
				cleanup();
				reject(new Error(msg.error));
			}
		};

		worker.onerror = () => {
			if (settled) return;
			settled = true;
			cleanup();
			// Fallback to main thread if worker script fails to initialize
			runIconVideoConversion(file, positions, signal, onProgress, options).then(
				resolve,
				reject,
			);
		};

		worker.postMessage({
			type: "start",
			file,
			positions,
			options,
		});
	});
}
