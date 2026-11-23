import type {
	ConversionOptions,
	Conversion as MediabunnyConversion,
	OutputFormat,
	QualityLevel,
	StreamTargetChunk,
} from "mediabunny";

export type VideoCompressContainer = "mp4" | "webm";
export type VideoResolutionCap = "original" | "1080" | "720" | "480";
export type VideoFpsCap = "original" | "30" | "24";

export interface VideoCompressOptions {
	container: VideoCompressContainer;
	quality: QualityLevel;
	maxHeight: VideoResolutionCap;
	maxFps: VideoFpsCap;
	muteAudio: boolean;
	stripMetadata: boolean;
	saveFileHandle?: FileSystemFileHandle;
}

export interface VideoToolResult {
	blob: Blob | null;
	mimeType: string;
	extension: string;
	originalSize: number;
	outputSize: number;
	streamedToDisk: boolean;
}

export async function compressOrConvertVideo(
	file: File,
	options: VideoCompressOptions,
	signal: AbortSignal,
	onProgress: (progress: number) => void,
): Promise<VideoToolResult> {
	signal.throwIfAborted();

	if (
		typeof VideoDecoder === "undefined" ||
		typeof VideoEncoder === "undefined"
	) {
		throw new Error(
			"Your browser does not support WebCodecs video encoding. Try a recent version of Chrome, Edge, Safari, or Firefox.",
		);
	}

	const {
		BlobSource,
		BufferTarget,
		Conversion,
		ConversionCanceledError,
		Input,
		MATROSKA,
		MP4,
		Mp4OutputFormat,
		Output,
		QTFF,
		Quality,
		StreamTarget,
		WEBM,
		WebMOutputFormat,
	} = await import("mediabunny");

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
	let writtenBytes = 0;

	try {
		const videoTrack = await input.getPrimaryVideoTrack();
		if (!videoTrack) {
			throw new Error("No video track was found in this file.");
		}
		if (!(await videoTrack.canDecode())) {
			throw new Error("Your browser cannot decode this video codec.");
		}

		const naturalHeight = await videoTrack.getDisplayHeight();
		const targetHeight =
			options.maxHeight === "original"
				? undefined
				: Math.min(naturalHeight, Number(options.maxHeight));

		const targetFps =
			options.maxFps === "original" ? undefined : Number(options.maxFps);

		const outputFormat: OutputFormat =
			options.container === "webm"
				? new WebMOutputFormat()
				: new Mp4OutputFormat({
						fastStart: options.saveFileHandle ? false : "in-memory",
					});

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
			target.on("write", ({ end }) => {
				if (end > writtenBytes) writtenBytes = end;
			});
		} else {
			bufferTarget = new BufferTarget();
			target = bufferTarget;
		}

		const output = new Output({ format: outputFormat, target });

		const conversionOptions: ConversionOptions = {
			input,
			output,
			tracks: "primary",
			showWarnings: false,
			...(options.stripMetadata ? { tags: { creationTime: null } } : {}),
			...(options.muteAudio ? { audio: { discard: true } } : {}),
			video: {
				quality: new Quality(options.quality),
				...(targetHeight ? { height: targetHeight } : {}),
				...(targetFps ? { frameRate: targetFps } : {}),
				allowTransformationMetadata: false,
				forceTranscode: true,
			},
		};

		const conversion = await Conversion.init(conversionOptions);
		if (!conversion.isValid) {
			throw new Error(
				`Could not encode this video to ${options.container.toUpperCase()} in your browser.`,
			);
		}

		activeConversion = conversion;
		signal.throwIfAborted();

		let lastPct = 0;
		conversion.onProgress = (ratio) => {
			const pct = Math.min(99, Math.max(0, Math.floor(ratio * 100)));
			if (pct !== lastPct) {
				lastPct = pct;
				onProgress(pct);
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

		onProgress(100);

		const ext = options.container;
		const mimeType = ext === "webm" ? "video/webm" : "video/mp4";

		if (options.saveFileHandle) {
			return {
				blob: null,
				mimeType,
				extension: ext,
				originalSize: file.size,
				outputSize: writtenBytes,
				streamedToDisk: true,
			};
		}

		if (!bufferTarget?.buffer || bufferTarget.buffer.byteLength === 0) {
			throw new Error("Video conversion produced an empty file.");
		}

		return {
			blob: new Blob([bufferTarget.buffer], { type: mimeType }),
			mimeType,
			extension: ext,
			originalSize: file.size,
			outputSize: bufferTarget.buffer.byteLength,
			streamedToDisk: false,
		};
	} finally {
		signal.removeEventListener("abort", onAbort);
		input.dispose();
	}
}

export async function muteVideoLossless(
	file: File,
	stripMetadata: boolean,
	signal: AbortSignal,
	onProgress: (progress: number) => void,
): Promise<VideoToolResult> {
	signal.throwIfAborted();

	const {
		BlobSource,
		BufferTarget,
		Conversion,
		ConversionCanceledError,
		Input,
		MATROSKA,
		MatroskaInputFormat,
		MkvOutputFormat,
		MP4,
		MovOutputFormat,
		Mp4OutputFormat,
		Output,
		QTFF,
		QuickTimeInputFormat,
		WEBM,
		WebMInputFormat,
		WebMOutputFormat,
	} = await import("mediabunny");

	const input = new Input({
		formats: [MP4, QTFF, WEBM, MATROSKA],
		source: new BlobSource(file),
	});

	let activeConversion: MediabunnyConversion | undefined;
	const onAbort = () => {
		void activeConversion?.cancel();
	};
	signal.addEventListener("abort", onAbort, { once: true });

	try {
		const [inputFormat, videoTrack] = await Promise.all([
			input.getFormat(),
			input.getPrimaryVideoTrack(),
		]);
		if (!videoTrack) {
			throw new Error("No video track was found in this file.");
		}

		const outputFormat =
			inputFormat instanceof WebMInputFormat
				? new WebMOutputFormat()
				: inputFormat instanceof MatroskaInputFormat
					? new MkvOutputFormat()
					: inputFormat instanceof QuickTimeInputFormat
						? new MovOutputFormat({ fastStart: "in-memory" })
						: new Mp4OutputFormat({ fastStart: "in-memory" });

		const extension =
			outputFormat instanceof WebMOutputFormat
				? "webm"
				: outputFormat instanceof MkvOutputFormat
					? "mkv"
					: outputFormat instanceof MovOutputFormat
						? "mov"
						: "mp4";

		const target = new BufferTarget();
		const output = new Output({ format: outputFormat, target });

		const conversion = await Conversion.init({
			input,
			output,
			tracks: "primary",
			showWarnings: false,
			audio: { discard: true },
			...(stripMetadata ? { tags: { creationTime: null } } : {}),
			copy: {
				mode: "forced",
				shiftTolerance: Number.POSITIVE_INFINITY,
			},
		});

		if (!conversion.isValid) {
			throw new Error(
				"Could not copy this video stream without re-encoding in your browser.",
			);
		}

		activeConversion = conversion;
		signal.throwIfAborted();

		conversion.onProgress = (ratio) => {
			onProgress(Math.min(99, Math.max(0, Math.floor(ratio * 100))));
		};

		try {
			await conversion.execute();
		} catch (error) {
			if (error instanceof ConversionCanceledError || signal.aborted) {
				throw signal.reason ?? error;
			}
			throw error;
		}

		onProgress(100);
		if (!target.buffer || target.buffer.byteLength === 0) {
			throw new Error("Muting video produced an empty file.");
		}

		return {
			blob: new Blob([target.buffer], { type: outputFormat.mimeType }),
			mimeType: outputFormat.mimeType,
			extension,
			originalSize: file.size,
			outputSize: target.buffer.byteLength,
			streamedToDisk: false,
		};
	} finally {
		signal.removeEventListener("abort", onAbort);
		input.dispose();
	}
}

export type AudioExtractFormat = "lossless" | "wav";

export async function extractCleanAudioFromVideo(
	file: File,
	extractFormat: AudioExtractFormat,
	stripMetadata: boolean,
	signal: AbortSignal,
	onProgress: (progress: number) => void,
): Promise<VideoToolResult> {
	signal.throwIfAborted();

	const {
		BlobSource,
		BufferTarget,
		Conversion,
		ConversionCanceledError,
		FlacOutputFormat,
		Input,
		MATROSKA,
		MP3,
		MP4,
		Mp3OutputFormat,
		Mp4OutputFormat,
		OGG,
		OggOutputFormat,
		Output,
		QTFF,
		WAVE,
		WavOutputFormat,
		WEBM,
		ADTS,
		FLAC,
	} = await import("mediabunny");

	const input = new Input({
		formats: [MP4, QTFF, WEBM, MATROSKA, MP3, WAVE, FLAC, OGG, ADTS],
		source: new BlobSource(file),
	});

	let activeConversion: MediabunnyConversion | undefined;
	const onAbort = () => {
		void activeConversion?.cancel();
	};
	signal.addEventListener("abort", onAbort, { once: true });

	try {
		const audioTrack = await input.getPrimaryAudioTrack();
		if (!audioTrack) {
			throw new Error("This file does not contain an audio track.");
		}

		const sourceAudioCodec = await audioTrack.getCodec();
		let outputFormat: OutputFormat;
		let extension: string;
		let mimeType: string;
		let forceCopy = false;

		if (extractFormat === "wav") {
			outputFormat = new WavOutputFormat();
			extension = "wav";
			mimeType = "audio/wav";
		} else {
			forceCopy = true;
			if (sourceAudioCodec === "opus" || sourceAudioCodec === "vorbis") {
				outputFormat = new OggOutputFormat();
				extension = "ogg";
				mimeType = "audio/ogg";
			} else if (sourceAudioCodec === "mp3") {
				outputFormat = new Mp3OutputFormat();
				extension = "mp3";
				mimeType = "audio/mpeg";
			} else if (sourceAudioCodec === "flac") {
				outputFormat = new FlacOutputFormat();
				extension = "flac";
				mimeType = "audio/flac";
			} else if (sourceAudioCodec?.startsWith("pcm-")) {
				outputFormat = new WavOutputFormat();
				extension = "wav";
				mimeType = "audio/wav";
			} else {
				outputFormat = new Mp4OutputFormat({ fastStart: "in-memory" });
				extension = "m4a";
				mimeType = "audio/mp4";
			}
		}

		const target = new BufferTarget();
		const output = new Output({ format: outputFormat, target });

		const conversion = await Conversion.init({
			input,
			output,
			tracks: "primary",
			showWarnings: false,
			video: { discard: true },
			...(stripMetadata ? { tags: { creationTime: null } } : {}),
			copy: {
				mode: forceCopy ? "forced" : "preferred",
				shiftTolerance: Number.POSITIVE_INFINITY,
			},
		});

		if (!conversion.isValid) {
			throw new Error(
				extractFormat === "lossless"
					? "Lossless extraction is unavailable for this codec. Try extracting to Clean WAV instead."
					: "Your browser could not decode this audio track to WAV.",
			);
		}

		activeConversion = conversion;
		signal.throwIfAborted();

		conversion.onProgress = (ratio) => {
			onProgress(Math.min(99, Math.max(0, Math.floor(ratio * 100))));
		};

		try {
			await conversion.execute();
		} catch (error) {
			if (error instanceof ConversionCanceledError || signal.aborted) {
				throw signal.reason ?? error;
			}
			throw error;
		}

		onProgress(100);
		if (!target.buffer || target.buffer.byteLength === 0) {
			throw new Error("Audio extraction produced an empty file.");
		}

		return {
			blob: new Blob([target.buffer], { type: mimeType }),
			mimeType,
			extension,
			originalSize: file.size,
			outputSize: target.buffer.byteLength,
			streamedToDisk: false,
		};
	} finally {
		signal.removeEventListener("abort", onAbort);
		input.dispose();
	}
}

export async function exportCanvasFrameBlob(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	mimeType: "image/png" | "image/jpeg" | "image/webp",
	quality = 0.92,
): Promise<Blob> {
	const q = mimeType === "image/png" ? undefined : quality;
	if ("convertToBlob" in canvas && typeof canvas.convertToBlob === "function") {
		return canvas.convertToBlob({ type: mimeType, quality: q });
	}
	return new Promise<Blob>((resolve, reject) => {
		(canvas as HTMLCanvasElement).toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("Could not encode video frame image."));
			},
			mimeType,
			q,
		);
	});
}
