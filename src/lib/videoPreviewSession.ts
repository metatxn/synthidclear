import type {
	InputAudioTrack,
	InputVideoTrack,
	AudioBufferSink as MediabunnyAudioBufferSink,
	CanvasSink as MediabunnyCanvasSink,
	Input as MediabunnyInput,
} from "mediabunny";

export interface VideoPreviewMetadata {
	width: number;
	height: number;
	duration: number;
	fps: number;
	frameDuration: number;
	hasAudio: boolean;
}

export interface FilmstripFrame {
	time: number;
	url: string;
}

export class VideoPreviewSession {
	readonly metadata: VideoPreviewMetadata;
	private readonly input: MediabunnyInput;
	private readonly videoTrack: InputVideoTrack;
	private readonly audioTrack: InputAudioTrack | null;
	private readonly frameSink: MediabunnyCanvasSink;
	private readonly audioSink: MediabunnyAudioBufferSink | null;
	private readonly CanvasSinkCtor: typeof MediabunnyCanvasSink;
	private disposed = false;

	private constructor(
		input: MediabunnyInput,
		videoTrack: InputVideoTrack,
		audioTrack: InputAudioTrack | null,
		frameSink: MediabunnyCanvasSink,
		audioSink: MediabunnyAudioBufferSink | null,
		CanvasSinkCtor: typeof MediabunnyCanvasSink,
		metadata: VideoPreviewMetadata,
	) {
		this.input = input;
		this.videoTrack = videoTrack;
		this.audioTrack = audioTrack;
		this.frameSink = frameSink;
		this.audioSink = audioSink;
		this.CanvasSinkCtor = CanvasSinkCtor;
		this.metadata = metadata;
	}

	static async open(file: Blob): Promise<VideoPreviewSession> {
		if (typeof VideoDecoder === "undefined") {
			throw new Error("WebCodecs VideoDecoder is unavailable in this browser.");
		}

		const {
			AudioBufferSink,
			BlobSource,
			CanvasSink,
			Input,
			MATROSKA,
			MP4,
			QTFF,
			WEBM,
		} = await import("mediabunny");

		const input = new Input({
			formats: [MP4, QTFF, WEBM, MATROSKA],
			source: new BlobSource(file),
		});

		try {
			const [videoTrack, audioTrack] = await Promise.all([
				input.getPrimaryVideoTrack(),
				input.getPrimaryAudioTrack(),
			]);

			if (!videoTrack) {
				throw new Error("No playable video track was found in this file.");
			}
			if (!(await videoTrack.canDecode())) {
				throw new Error("Your browser cannot decode this video codec.");
			}

			const [width, height, duration, fpsMetrics] = await Promise.all([
				videoTrack.getDisplayWidth(),
				videoTrack.getDisplayHeight(),
				videoTrack.computeDuration(),
				videoTrack
					.computeFrameRateMetrics({ targetPacketCount: 120 })
					.catch(() => null),
			]);

			if (!width || !height || !Number.isFinite(duration) || duration <= 0) {
				throw new Error(
					"Choose a video with a playable picture and a known duration.",
				);
			}

			const fps =
				fpsMetrics &&
				Number.isFinite(fpsMetrics.bestGuessFrameRate) &&
				fpsMetrics.bestGuessFrameRate > 0
					? Math.round(fpsMetrics.bestGuessFrameRate * 100) / 100
					: 30;

			const frameSink = new CanvasSink(videoTrack, {
				poolSize: 2,
			});

			let audioSink: MediabunnyAudioBufferSink | null = null;
			if (audioTrack && (await audioTrack.canDecode().catch(() => false))) {
				audioSink = new AudioBufferSink(audioTrack);
			}

			return new VideoPreviewSession(
				input,
				videoTrack,
				audioTrack,
				frameSink,
				audioSink,
				CanvasSink,
				{
					width,
					height,
					duration,
					fps,
					frameDuration: 1 / fps,
					hasAudio: Boolean(audioTrack),
				},
			);
		} catch (error) {
			input.dispose();
			throw error;
		}
	}

	async getFrameCanvas(
		timestamp: number,
	): Promise<HTMLCanvasElement | OffscreenCanvas | null> {
		if (this.disposed) return null;
		const clamped = Math.max(0, Math.min(this.metadata.duration, timestamp));
		const wrapped = await this.frameSink.getCanvas(clamped);
		return wrapped?.canvas ?? null;
	}

	async generateFilmstrip(
		count = 10,
		thumbWidth = 128,
		signal?: AbortSignal,
	): Promise<FilmstripFrame[]> {
		if (this.disposed || signal?.aborted) return [];
		const safeCount = Math.max(2, Math.min(16, count));
		const duration = this.metadata.duration;
		const timestamps: number[] = [];
		for (let i = 0; i < safeCount; i++) {
			const ratio = safeCount === 1 ? 0 : i / (safeCount - 1);
			timestamps.push(
				Math.min(Math.max(0, duration * ratio), Math.max(0, duration - 0.02)),
			);
		}

		const thumbSink = new this.CanvasSinkCtor(this.videoTrack, {
			width: thumbWidth,
			poolSize: 2,
		});

		const frames: FilmstripFrame[] = [];
		let idx = 0;

		try {
			for await (const wrapped of thumbSink.canvasesAtTimestamps(timestamps)) {
				if (this.disposed || signal?.aborted) break;
				const ts = timestamps[idx++] ?? 0;
				if (!wrapped) continue;
				const canvas = wrapped.canvas;
				let blob: Blob | null = null;
				if (
					"convertToBlob" in canvas &&
					typeof canvas.convertToBlob === "function"
				) {
					blob = await canvas.convertToBlob({
						type: "image/jpeg",
						quality: 0.72,
					});
				} else if ("toBlob" in canvas && typeof canvas.toBlob === "function") {
					blob = await new Promise<Blob | null>((resolve) =>
						canvas.toBlob(resolve, "image/jpeg", 0.72),
					);
				}
				if (blob) {
					frames.push({ time: ts, url: URL.createObjectURL(blob) });
				}
			}
		} catch {
			// Return any frames decoded so far
		}
		return frames;
	}

	/**
	 * Streams decoded video frames and optional Web Audio playback in real time
	 * from startTime to endTime, invoking onFrame for every rendered frame.
	 */
	async play(params: {
		startTime: number;
		endTime: number;
		muted: boolean;
		signal: AbortSignal;
		onFrame: (
			canvas: HTMLCanvasElement | OffscreenCanvas,
			timestamp: number,
		) => void;
	}): Promise<void> {
		if (this.disposed || params.signal.aborted) return;

		const start = Math.max(0, params.startTime);
		const end = Math.min(this.metadata.duration, params.endTime);
		if (end <= start) return;

		let audioCtx: AudioContext | null = null;
		const scheduledSources: AudioBufferSourceNode[] = [];
		const playbackStartWall = performance.now() / 1000;
		let audioStartBase = 0;

		if (
			!params.muted &&
			this.audioSink &&
			typeof AudioContext !== "undefined"
		) {
			try {
				audioCtx = new AudioContext();
				if (audioCtx.state === "suspended") {
					await audioCtx.resume();
				}
				audioStartBase = audioCtx.currentTime + 0.04;
			} catch {
				audioCtx = null;
			}
		}

		const stopAudio = () => {
			for (const src of scheduledSources) {
				try {
					src.stop();
				} catch {
					// Already stopped
				}
			}
			scheduledSources.length = 0;
			if (audioCtx) {
				void audioCtx.close().catch(() => {});
				audioCtx = null;
			}
		};

		const onAbort = () => stopAudio();
		params.signal.addEventListener("abort", onAbort, { once: true });

		const audioPump =
			audioCtx && this.audioSink
				? (async () => {
						const ctx = audioCtx;
						const sink = this.audioSink;
						if (!ctx || !sink) return;
						try {
							for await (const wrapped of sink.buffers(start, end)) {
								if (this.disposed || params.signal.aborted) break;
								const when = audioStartBase + (wrapped.timestamp - start);
								if (when + wrapped.duration < ctx.currentTime) continue;
								const src = ctx.createBufferSource();
								src.buffer = wrapped.buffer;
								src.connect(ctx.destination);
								if (when >= ctx.currentTime) {
									src.start(when);
								} else {
									src.start(ctx.currentTime, ctx.currentTime - when);
								}
								scheduledSources.push(src);
								// Avoid buffering too far ahead in memory
								while (
									!this.disposed &&
									!params.signal.aborted &&
									when - ctx.currentTime > 1.0
								) {
									await new Promise((r) => setTimeout(r, 80));
								}
							}
						} catch {
							// Audio playback stopped/aborted
						}
					})()
				: Promise.resolve();

		try {
			for await (const wrapped of this.frameSink.canvases(start, end)) {
				if (this.disposed || params.signal.aborted) break;
				const elapsed = audioCtx
					? audioCtx.currentTime - audioStartBase
					: performance.now() / 1000 - playbackStartWall;
				const targetElapsed = wrapped.timestamp - start;
				const delayMs = (targetElapsed - elapsed) * 1000;
				if (delayMs > 4) {
					await new Promise<void>((resolve) => {
						const timer = setTimeout(resolve, Math.min(delayMs, 500));
						const cancelWait = () => {
							clearTimeout(timer);
							resolve();
						};
						params.signal.addEventListener("abort", cancelWait, { once: true });
					});
				}
				if (this.disposed || params.signal.aborted) break;
				params.onFrame(wrapped.canvas, wrapped.timestamp);
			}
		} finally {
			params.signal.removeEventListener("abort", onAbort);
			stopAudio();
			await audioPump.catch(() => {});
		}
	}

	getHasAudio(): boolean {
		return Boolean(this.audioTrack);
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.input.dispose();
	}
}
