import {
	ChevronLeft,
	ChevronRight,
	Download,
	FlipHorizontal2,
	HardDriveDownload,
	Pause,
	Play,
	RotateCcw,
	RotateCw,
	Scissors,
	Volume2,
	VolumeX,
} from "lucide-react";
import {
	type CSSProperties,
	type FormEvent,
	type PointerEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { buildCleanedFilename } from "#/lib/format";
import {
	clamp,
	drawRepairedFrame,
	exportIconImage,
	getIconMediaKind,
	getRepairContext,
	ICON_MEDIA_ACCEPT,
	type IconPosition,
	type IconRegion,
	regionAtTime,
	repairRegion,
} from "#/lib/iconRemoval";
import {
	exportIconVideo,
	type IconVideoExportOptions,
	pickVideoSaveHandle,
	supportsDirectDiskSave,
} from "#/lib/iconVideoExport";
import {
	type FilmstripFrame,
	VideoPreviewSession,
} from "#/lib/videoPreviewSession";
import { UploadDropzone } from "./UploadDropzone";

const primaryButton =
	"touch-target inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-(--brand-color) px-4 py-2 text-sm font-semibold text-(--brand-text) no-underline hover:bg-(--brand-hover) disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
	"touch-target inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-(--border-color) bg-(--bg-card) px-3 py-1.5 text-sm font-medium text-(--text-primary) hover:border-(--text-muted) disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-(--brand-color)";
const coordinateKeys = ["x", "y", "width", "height"] as const;

type RotationDegrees = 0 | 90 | 180 | 270;

function useObjectUrl(blob: Blob | null) {
	const [url, setUrl] = useState("");
	useEffect(() => {
		if (!blob) {
			setUrl("");
			return;
		}
		const objectUrl = URL.createObjectURL(blob);
		setUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [blob]);
	return url;
}

type Point = Pick<IconRegion, "x" | "y">;
type MediaInfo = {
	width: number;
	height: number;
	duration?: number;
	fps?: number;
	frameDuration?: number;
	hasAudio?: boolean;
};

function getPoint(
	event: PointerEvent<HTMLElement>,
	width: number,
	height: number,
): Point {
	const bounds = event.currentTarget.getBoundingClientRect();
	return {
		x: clamp(
			Math.round(((event.clientX - bounds.left) * width) / bounds.width),
			0,
			width,
		),
		y: clamp(
			Math.round(((event.clientY - bounds.top) * height) / bounds.height),
			0,
			height,
		),
	};
}

function getSelection(start: Point, end: Point): IconRegion {
	return {
		x: Math.min(start.x, end.x),
		y: Math.min(start.y, end.y),
		width: Math.abs(start.x - end.x),
		height: Math.abs(start.y - end.y),
	};
}

function timeLabel(time: number) {
	return `${time.toFixed(2)} s`;
}

function drawTransformedSource(
	canvas: HTMLCanvasElement,
	source: CanvasImageSource,
	srcWidth: number,
	srcHeight: number,
	rotate: RotationDegrees,
	flip: boolean,
	region?: IconRegion,
) {
	const ctx = getRepairContext(canvas);
	const outW = canvas.width;
	const outH = canvas.height;
	ctx.clearRect(0, 0, outW, outH);
	ctx.save();
	ctx.translate(outW / 2, outH / 2);
	if (flip) {
		ctx.scale(-1, 1);
	}
	if (rotate !== 0) {
		ctx.rotate((rotate * Math.PI) / 180);
	}
	ctx.drawImage(source, -srcWidth / 2, -srcHeight / 2, srcWidth, srcHeight);
	ctx.restore();
	repairRegion(ctx, region);
}

export function IconRemovalWorkspace() {
	const [selection, setSelection] = useState<{
		file: File;
		isVideo: boolean;
	} | null>(null);
	const [error, setError] = useState("");

	return selection ? (
		<IconEditor
			file={selection.file}
			isVideo={selection.isVideo}
			onClose={() => setSelection(null)}
		/>
	) : (
		<div className="space-y-3">
			<UploadDropzone
				accept={ICON_MEDIA_ACCEPT}
				singleFile
				filterFiles={(files) => Array.from(files)}
				ariaLabel="Open a photo or video in the icon editor"
				heading="Drop a photo or video here"
				subtext="PNG, JPEG, WebP, AVIF, MP4, MOV, WebM or MKV · Stays on your device"
				onFilesAdded={([file]) => {
					if (!file) return;
					const kind = getIconMediaKind(file);
					setError(
						kind
							? ""
							: "Choose a PNG, JPEG, WebP, AVIF, MP4, MOV, WebM or MKV file.",
					);
					if (kind) setSelection({ file, isVideo: kind === "video" });
				}}
			/>
			{error && (
				<p role="alert" className="text-sm text-(--danger-color)">
					{error}
				</p>
			)}
		</div>
	);
}

function IconEditor({
	file,
	isVideo,
	onClose,
}: {
	file: File;
	isVideo: boolean;
	onClose: () => void;
}) {
	const sourceUrl = useObjectUrl(file);
	const [info, setInfo] = useState<MediaInfo>();
	const [activeFrameCanvas, setActiveFrameCanvas] = useState<
		HTMLCanvasElement | OffscreenCanvas | null
	>(null);
	const [useVideoFallback, setUseVideoFallback] = useState(false);
	const [filmstrip, setFilmstrip] = useState<FilmstripFrame[]>([]);
	const [positions, setPositions] = useState<IconPosition[]>([]);
	const [draft, setDraft] = useState<IconRegion>();
	const [time, setTime] = useState(0);
	const [seeking, setSeeking] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [edited, setEdited] = useState(false);

	// Video export options
	const [stripMetadata, setStripMetadata] = useState(true);
	const [muteAudio, setMuteAudio] = useState(false);
	const [trimStart, setTrimStart] = useState(0);
	const [trimEnd, setTrimEnd] = useState<number | null>(null);
	const [rotate, setRotate] = useState<RotationDegrees>(0);
	const [flip, setFlip] = useState(false);
	const [cropEnabled, setCropEnabled] = useState(false);
	const [cropBox, setCropBox] = useState<IconRegion | null>(null);

	const [progress, setProgress] = useState<number>();
	const [result, setResult] = useState<Blob | null>(null);
	const [resultExtension, setResultExtension] = useState<string>("mp4");
	const [savedToDiskMessage, setSavedToDiskMessage] = useState("");
	const [error, setError] = useState("");

	const timelineId = useId();
	const stripMetaId = useId();
	const muteAudioId = useId();
	const trimStartId = useId();
	const trimEndId = useId();
	const cropToggleId = useId();

	const resultUrl = useObjectUrl(result);
	const imageRef = useRef<HTMLImageElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const previewRef = useRef<HTMLCanvasElement>(null);
	const sessionRef = useRef<VideoPreviewSession | null>(null);
	const lastFrameCanvasRef = useRef<HTMLCanvasElement | OffscreenCanvas | null>(
		null,
	);
	const playControllerRef = useRef<AbortController | null>(null);
	const seekTokenRef = useRef(0);
	const drag = useRef<{ start: Point; pointerId: number } | null>(null);
	const exportJob = useRef<AbortController | null>(null);

	const canDirectDiskSave = useMemo(() => supportsDirectDiskSave(), []);
	const busy = progress !== undefined;
	const canEdit = !busy && !seeking && !isPlaying;

	const displayWidth = info
		? rotate === 90 || rotate === 270
			? info.height
			: info.width
		: 0;
	const displayHeight = info
		? rotate === 90 || rotate === 270
			? info.width
			: info.height
		: 0;

	const region = useMemo(
		() => regionAtTime(positions, time),
		[positions, time],
	);
	const box = draft ?? (!edited ? region : undefined);
	const selectedPosition = positions.some(
		(position) => Math.abs(position.time - time) < 0.005,
	);

	const effectiveTrimEnd =
		info?.duration !== undefined ? (trimEnd ?? info.duration) : 0;
	const hasTrim =
		info?.duration !== undefined &&
		(trimStart > 0.01 || effectiveTrimEnd < info.duration - 0.01);
	const canExportVideo =
		isVideo &&
		Boolean(info) &&
		(positions.length > 0 ||
			hasTrim ||
			muteAudio ||
			rotate !== 0 ||
			flip ||
			(cropEnabled && Boolean(cropBox)) ||
			stripMetadata);

	const stopPlayback = useCallback(() => {
		if (playControllerRef.current) {
			playControllerRef.current.abort();
			playControllerRef.current = null;
		}
		setIsPlaying(false);
	}, []);

	// Open Mediabunny VideoPreviewSession for videos
	useEffect(() => {
		if (!isVideo) return;
		const abortController = new AbortController();
		let activeSession: VideoPreviewSession | null = null;
		const createdUrls: string[] = [];

		setInfo(undefined);
		setFilmstrip([]);
		setUseVideoFallback(false);
		setError("");

		void VideoPreviewSession.open(file)
			.then(async (session) => {
				if (abortController.signal.aborted) {
					session.dispose();
					return;
				}
				activeSession = session;
				sessionRef.current = session;
				const firstFrame = await session.getFrameCanvas(0);
				if (abortController.signal.aborted) {
					return;
				}
				if (firstFrame) {
					lastFrameCanvasRef.current = firstFrame;
					setActiveFrameCanvas(firstFrame);
				}
				setInfo({
					width: session.metadata.width,
					height: session.metadata.height,
					duration: session.metadata.duration,
					fps: session.metadata.fps,
					frameDuration: session.metadata.frameDuration,
					hasAudio: session.metadata.hasAudio,
				});
				setTrimStart(0);
				setTrimEnd(session.metadata.duration);
				setTime(0);

				const strip = await session.generateFilmstrip(
					10,
					128,
					abortController.signal,
				);
				for (const item of strip) createdUrls.push(item.url);
				if (!abortController.signal.aborted) {
					setFilmstrip(strip);
				}
			})
			.catch(() => {
				if (!abortController.signal.aborted) {
					// Fallback to native <video> element preview if WebCodecs VideoDecoder cannot decode
					setUseVideoFallback(true);
				}
			});

		return () => {
			abortController.abort();
			stopPlayback();
			if (activeSession) {
				activeSession.dispose();
				if (sessionRef.current === activeSession) {
					sessionRef.current = null;
				}
			}
			for (const url of createdUrls) {
				URL.revokeObjectURL(url);
			}
		};
	}, [file, isVideo, stopPlayback]);

	useEffect(
		() => () => {
			exportJob.current?.abort();
			stopPlayback();
		},
		[stopPlayback],
	);

	const renderFrameToPreview = useCallback(
		(
			source: CanvasImageSource,
			srcW: number,
			srcH: number,
			activeRegion?: IconRegion,
		) => {
			const canvas = previewRef.current;
			if (!canvas) return;
			try {
				if (isVideo && (rotate !== 0 || flip)) {
					drawTransformedSource(
						canvas,
						source,
						srcW,
						srcH,
						rotate,
						flip,
						edited ? activeRegion : undefined,
					);
				} else {
					drawRepairedFrame(
						getRepairContext(canvas),
						source,
						edited ? activeRegion : undefined,
					);
				}
			} catch {
				setError("The preview could not be drawn. Try opening another file.");
			}
		},
		[edited, flip, isVideo, rotate],
	);

	// Redraw whenever image/video frame, edited toggle, transform, or region changes
	useEffect(() => {
		if (!info || seeking || isPlaying) return;
		if (!isVideo) {
			const img = imageRef.current;
			if (!img) return;
			renderFrameToPreview(img, info.width, info.height, region);
			return;
		}
		if (useVideoFallback) {
			const video = videoRef.current;
			if (!video) return;
			renderFrameToPreview(video, info.width, info.height, region);
			return;
		}
		const cached = activeFrameCanvas ?? lastFrameCanvasRef.current;
		if (cached) {
			renderFrameToPreview(cached, info.width, info.height, region);
		}
	}, [
		activeFrameCanvas,
		info,
		isPlaying,
		isVideo,
		region,
		renderFrameToPreview,
		seeking,
		useVideoFallback,
	]);

	function invalidateResult() {
		setResult(null);
		setSavedToDiskMessage("");
	}

	function commit(next: IconRegion) {
		if (!info || !canEdit) return;
		const normalized: IconRegion = {
			x: Math.round(next.x),
			y: Math.round(next.y),
			width: Math.round(next.width),
			height: Math.round(next.height),
		};
		if (
			!Number.isFinite(normalized.x) ||
			!Number.isFinite(normalized.y) ||
			!Number.isFinite(normalized.width) ||
			!Number.isFinite(normalized.height) ||
			normalized.width < 1 ||
			normalized.height < 1
		) {
			return;
		}
		if (
			normalized.x < 0 ||
			normalized.y < 0 ||
			normalized.x + normalized.width > displayWidth ||
			normalized.y + normalized.height > displayHeight ||
			(normalized.width === displayWidth && normalized.height === displayHeight)
		) {
			setError(
				"Keep the selection inside the frame and leave some background around it.",
			);
			return;
		}
		setPositions((current) =>
			[
				...current.filter(
					(position) => Math.abs(position.time - time) >= 0.005,
				),
				{ time, region: normalized },
			].sort((left, right) => left.time - right.time),
		);
		invalidateResult();
		setError("");
	}

	function startSelection(event: PointerEvent<HTMLElement>) {
		if (!info || !canEdit || drag.current || event.button !== 0) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		const start = getPoint(event, displayWidth, displayHeight);
		drag.current = { start, pointerId: event.pointerId };
		setEdited(false);
		setDraft(getSelection(start, start));
	}

	function moveSelection(event: PointerEvent<HTMLElement>) {
		if (!info || drag.current?.pointerId !== event.pointerId) return;
		setDraft(
			getSelection(
				drag.current.start,
				getPoint(event, displayWidth, displayHeight),
			),
		);
	}

	function finishSelection(event: PointerEvent<HTMLElement>) {
		if (!info || drag.current?.pointerId !== event.pointerId) return;
		const next = getSelection(
			drag.current.start,
			getPoint(event, displayWidth, displayHeight),
		);
		drag.current = null;
		setDraft(undefined);
		commit(next);
	}

	function cancelSelection(event: PointerEvent<HTMLElement>) {
		if (drag.current?.pointerId !== event.pointerId) return;
		drag.current = null;
		setDraft(undefined);
	}

	const seek = useCallback(
		(nextRaw: number) => {
			if (!info || info.duration === undefined) return;
			stopPlayback();
			const next = clamp(nextRaw, 0, info.duration);
			setTime(next);

			if (useVideoFallback) {
				const video = videoRef.current;
				if (!video) return;
				if (Math.abs(video.currentTime - next) > 0.001) {
					setSeeking(true);
					video.currentTime = next;
				}
				return;
			}

			const session = sessionRef.current;
			if (!session) return;
			const token = ++seekTokenRef.current;
			setSeeking(true);
			void session
				.getFrameCanvas(next)
				.then((frameCanvas) => {
					if (token !== seekTokenRef.current) return;
					if (frameCanvas) {
						lastFrameCanvasRef.current = frameCanvas;
						setActiveFrameCanvas(frameCanvas);
						renderFrameToPreview(
							frameCanvas,
							info.width,
							info.height,
							regionAtTime(positions, next),
						);
					}
				})
				.catch(() => {
					// Keep previous frame on transient seek error
				})
				.finally(() => {
					if (token === seekTokenRef.current) {
						setSeeking(false);
					}
				});
		},
		[info, positions, renderFrameToPreview, stopPlayback, useVideoFallback],
	);

	function stepFrame(deltaFrames: number) {
		if (!info?.duration) return;
		const step = info.frameDuration ?? 1 / 30;
		seek(time + deltaFrames * step);
	}

	async function togglePlayback() {
		if (!info?.duration || busy) return;
		if (isPlaying) {
			stopPlayback();
			return;
		}
		const session = sessionRef.current;
		if (!session) return;

		const startAt =
			time >= effectiveTrimEnd - 0.05 || time < trimStart ? trimStart : time;
		const controller = new AbortController();
		playControllerRef.current = controller;
		setIsPlaying(true);

		try {
			await session.play({
				startTime: startAt,
				endTime: effectiveTrimEnd,
				muted: muteAudio,
				signal: controller.signal,
				onFrame: (frameCanvas, timestamp) => {
					lastFrameCanvasRef.current = frameCanvas;
					setTime(timestamp);
					renderFrameToPreview(
						frameCanvas,
						info.width,
						info.height,
						regionAtTime(positions, timestamp),
					);
				},
			});
		} finally {
			if (playControllerRef.current === controller) {
				playControllerRef.current = null;
				setIsPlaying(false);
			}
		}
	}

	function applyCoordinates(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const fields = new FormData(event.currentTarget);
		commit({
			x: Number(fields.get("x")),
			y: Number(fields.get("y")),
			width: Number(fields.get("width")),
			height: Number(fields.get("height")),
		});
	}

	function buildVideoExportOptions(
		saveFileHandle?: FileSystemFileHandle,
	): IconVideoExportOptions {
		const validCrop =
			cropEnabled && cropBox && cropBox.width >= 2 && cropBox.height >= 2
				? {
						left: clamp(Math.round(cropBox.x), 0, displayWidth - 2),
						top: clamp(Math.round(cropBox.y), 0, displayHeight - 2),
						width: clamp(Math.round(cropBox.width), 2, displayWidth),
						height: clamp(Math.round(cropBox.height), 2, displayHeight),
					}
				: undefined;

		return {
			stripMetadata,
			muteAudio,
			trim: hasTrim
				? {
						start: trimStart > 0.01 ? trimStart : undefined,
						end:
							info?.duration && effectiveTrimEnd < info.duration - 0.01
								? effectiveTrimEnd
								: undefined,
					}
				: undefined,
			crop: validCrop,
			rotate: rotate !== 0 ? rotate : undefined,
			flip: flip || undefined,
			saveFileHandle,
		};
	}

	async function exportFile(directToDisk = false) {
		if (!info || !canEdit || exportJob.current) return;
		if (!isVideo && !region) return;
		if (isVideo && !canExportVideo) return;

		stopPlayback();

		let saveHandle: FileSystemFileHandle | undefined;
		if (isVideo && directToDisk) {
			const ext = /\.webm$/i.test(file.name)
				? "webm"
				: /\.mkv$/i.test(file.name)
					? "mkv"
					: /\.mov$/i.test(file.name)
						? "mov"
						: "mp4";
			const mime =
				ext === "webm"
					? "video/webm"
					: ext === "mkv"
						? "video/x-matroska"
						: ext === "mov"
							? "video/quicktime"
							: "video/mp4";
			const picked = await pickVideoSaveHandle(
				buildCleanedFilename(file.name, "_edited", ext),
				ext,
				mime,
			);
			if (!picked) return;
			saveHandle = picked;
		}

		const controller = new AbortController();
		exportJob.current = controller;
		setError("");
		setSavedToDiskMessage("");
		setProgress(0);
		try {
			if (isVideo) {
				const exported = await exportIconVideo(
					file,
					positions,
					controller.signal,
					setProgress,
					buildVideoExportOptions(saveHandle),
				);
				if (!controller.signal.aborted) {
					setResultExtension(exported.extension);
					if (exported.streamedToDisk) {
						setResult(null);
						setSavedToDiskMessage(
							`Saved clean ${exported.extension.toUpperCase()} directly to disk.`,
						);
					} else if (exported.blob) {
						setResult(exported.blob);
					}
				}
			} else {
				const canvas = document.createElement("canvas");
				canvas.width = info.width;
				canvas.height = info.height;
				const image = imageRef.current;
				if (!image) throw new Error("The source image is unavailable.");
				drawRepairedFrame(getRepairContext(canvas), image, region);
				const output = await exportIconImage(canvas);
				if (!controller.signal.aborted) {
					setResultExtension("png");
					setResult(output);
				}
			}
		} catch (reason) {
			if (!controller.signal.aborted) {
				setError(
					reason instanceof Error
						? reason.message
						: "The export could not finish.",
				);
			}
		} finally {
			if (exportJob.current === controller) {
				exportJob.current = null;
				setProgress(undefined);
			}
		}
	}

	const defaultBox =
		info &&
		displayWidth > 0 &&
		displayHeight > 0 &&
		(region ?? {
			x: Math.floor(displayWidth * 0.85),
			y: Math.floor(displayHeight * 0.85),
			width: Math.max(1, Math.floor(displayWidth * 0.1)),
			height: Math.max(1, Math.floor(displayHeight * 0.1)),
		});

	const timelineProgressPct =
		info?.duration && info.duration > 0
			? clamp((time / info.duration) * 100, 0, 100)
			: 0;

	return (
		<section
			aria-label="Visible icon editor"
			className="space-y-4 rounded-2xl border border-(--border-color) bg-(--bg-card) p-3 sm:p-5"
		>
			<div className="flex items-center justify-between gap-3">
				<p
					className="m-0 min-w-0 truncate text-sm font-semibold text-(--text-primary)"
					title={file.name}
				>
					{file.name}
				</p>
				<button
					type="button"
					className={secondaryButton}
					disabled={busy}
					onClick={onClose}
				>
					Close file
				</button>
			</div>

			{sourceUrl &&
				(isVideo ? (
					useVideoFallback && (
						<video
							ref={videoRef}
							src={sourceUrl}
							preload="auto"
							playsInline
							muted
							hidden
							onLoadedData={({ currentTarget: video }) => {
								if (
									video.videoWidth &&
									video.videoHeight &&
									Number.isFinite(video.duration) &&
									video.duration > 0
								) {
									setInfo({
										width: video.videoWidth,
										height: video.videoHeight,
										duration: video.duration,
										fps: 30,
										frameDuration: 1 / 30,
										hasAudio: true,
									});
									setTrimStart(0);
									setTrimEnd(video.duration);
								} else {
									setError(
										"Choose a video with a playable picture and a known duration.",
									);
								}
							}}
							onSeeked={() => setSeeking(false)}
							onError={() =>
								setError(
									"Your browser could not open this video. Try an H.264 MP4, MOV, WebM, or MKV file.",
								)
							}
						/>
					)
				) : (
					<img
						ref={imageRef}
						src={sourceUrl}
						alt=""
						hidden
						onLoad={({ currentTarget: image }) =>
							setInfo({
								width: image.naturalWidth,
								height: image.naturalHeight,
							})
						}
						onError={() =>
							setError(
								"Your browser could not open this image. Try a PNG or JPEG file.",
							)
						}
					/>
				))}

			{info && displayWidth > 0 && displayHeight > 0 ? (
				<>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="m-0 text-sm text-(--text-secondary)">
							Drag a tight box around the whole icon, including its shadow.
						</p>
						<fieldset className="m-0 flex gap-1 border-0 p-0">
							<legend className="visually-hidden">Preview mode</legend>
							<button
								type="button"
								aria-pressed={!edited}
								className={secondaryButton}
								onClick={() => setEdited(false)}
							>
								Original
							</button>
							<button
								type="button"
								aria-pressed={edited}
								disabled={!region}
								className={secondaryButton}
								onClick={() => setEdited(true)}
							>
								Edited
							</button>
						</fieldset>
					</div>

					<div className="grid place-items-center overflow-hidden rounded-xl border border-(--border-color) bg-black">
						<div
							className="relative max-w-full touch-none select-none [&:not([aria-disabled=true])]:cursor-crosshair"
							aria-disabled={!canEdit}
							onPointerDown={startSelection}
							onPointerMove={moveSelection}
							onPointerUp={finishSelection}
							onPointerCancel={cancelSelection}
							onLostPointerCapture={cancelSelection}
						>
							<canvas
								ref={previewRef}
								width={displayWidth}
								height={displayHeight}
								aria-label={
									edited ? "Edited media preview" : "Original media preview"
								}
								className="block max-h-[min(65vh,32rem)] max-w-full"
							/>
							{cropEnabled && cropBox && (
								<span
									aria-hidden="true"
									className="pointer-events-none absolute border-2 border-dashed border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
									style={{
										left: `${(100 * cropBox.x) / displayWidth}%`,
										top: `${(100 * cropBox.y) / displayHeight}%`,
										width: `${(100 * cropBox.width) / displayWidth}%`,
										height: `${(100 * cropBox.height) / displayHeight}%`,
									}}
								/>
							)}
							{box && (
								<span
									aria-hidden="true"
									className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_1px_#111]"
									style={{
										left: `${(100 * box.x) / displayWidth}%`,
										top: `${(100 * box.y) / displayHeight}%`,
										width: `${(100 * box.width) / displayWidth}%`,
										height: `${(100 * box.height) / displayHeight}%`,
									}}
								/>
							)}
						</div>
					</div>

					{info.duration !== undefined && (
						<div className="space-y-3 rounded-xl border border-(--border-color) bg-(--bg-surface)/60 p-3">
							{/* Playback & Frame-Stepping Bar */}
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex flex-wrap items-center gap-1.5">
									{!useVideoFallback && (
										<button
											type="button"
											className={secondaryButton}
											disabled={busy}
											aria-pressed={isPlaying}
											onClick={() => void togglePlayback()}
										>
											{isPlaying ? (
												<>
													<Pause className="h-3.5 w-3.5" aria-hidden="true" />
													Pause
												</>
											) : (
												<>
													<Play className="h-3.5 w-3.5" aria-hidden="true" />
													{edited ? "Preview repaired" : "Play"}
												</>
											)}
										</button>
									)}
									<button
										type="button"
										className={secondaryButton}
										disabled={busy || time <= 0}
										aria-label="Step back one frame"
										onClick={() => stepFrame(-1)}
									>
										<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
										-1f
									</button>
									<button
										type="button"
										className={secondaryButton}
										disabled={busy || time >= info.duration}
										aria-label="Step forward one frame"
										onClick={() => stepFrame(1)}
									>
										+1f
										<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
									</button>
								</div>

								<div className="flex items-center gap-2 text-xs font-medium text-(--text-secondary)">
									<label htmlFor={timelineId} className="sr-only">
										Video position
									</label>
									<span className="tabular font-semibold text-(--text-primary)">
										{timeLabel(time)} / {timeLabel(info.duration)}
									</span>
									{info.fps && (
										<span className="tabular rounded-md border border-(--border-color) bg-(--bg-card) px-1.5 py-0.5 font-mono text-[11px]">
											{info.fps} fps
										</span>
									)}
								</div>
							</div>

							{/* Visual Filmstrip Thumbnail Strip */}
							{filmstrip.length > 0 && (
								<div className="relative overflow-hidden rounded-lg border border-(--border-color) bg-black">
									<div
										className="grid"
										style={{
											gridTemplateColumns: `repeat(${filmstrip.length}, minmax(0, 1fr))`,
										}}
									>
										{filmstrip.map((frame) => (
											<button
												key={frame.time}
												type="button"
												disabled={busy}
												onClick={() => seek(frame.time)}
												aria-label={`Jump to ${timeLabel(frame.time)}`}
												className="group relative block h-11 cursor-pointer overflow-hidden border-0 bg-transparent p-0 focus-visible:z-10"
											>
												<img
													src={frame.url}
													alt=""
													className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
												/>
											</button>
										))}
									</div>
									{/* Dimmed outside-trim masks */}
									{hasTrim && info.duration > 0 && (
										<>
											<span
												aria-hidden="true"
												className="pointer-events-none absolute inset-y-0 left-0 bg-black/65"
												style={{
													width: `${(trimStart / info.duration) * 100}%`,
												}}
											/>
											<span
												aria-hidden="true"
												className="pointer-events-none absolute inset-y-0 right-0 bg-black/65"
												style={{
													width: `${Math.max(0, 100 - (effectiveTrimEnd / info.duration) * 100)}%`,
												}}
											/>
										</>
									)}
									{/* Playhead line */}
									<span
										aria-hidden="true"
										className="pointer-events-none absolute inset-y-0 w-0.5 bg-(--brand-color)"
										style={{ left: `${timelineProgressPct}%` }}
									/>
								</div>
							)}

							<input
								id={timelineId}
								type="range"
								min={0}
								max={info.duration}
								step="any"
								value={time}
								aria-valuetext={timeLabel(time)}
								disabled={busy}
								onChange={(event) => seek(Number(event.target.value))}
								style={
									{
										"--range-progress": `${timelineProgressPct}%`,
									} as CSSProperties
								}
								className="branded-range w-full cursor-pointer accent-(--brand-color)"
							/>

							<p className="m-0 text-xs text-(--text-secondary)">
								For a moving icon, click a thumbnail or step frames and draw a
								new box. The repair box tracks smoothly between marked times.
							</p>

							{positions.length > 0 && (
								<ul
									aria-label="Marked positions"
									className="m-0 flex list-none flex-wrap gap-1.5 p-0"
								>
									{positions.map((position) => (
										<li key={position.time}>
											<button
												type="button"
												className={secondaryButton}
												aria-pressed={Math.abs(position.time - time) < 0.005}
												disabled={busy}
												onClick={() => seek(position.time)}
											>
												{timeLabel(position.time)}
											</button>
										</li>
									))}
								</ul>
							)}
						</div>
					)}

					{/* Video Privacy, Trim, Rotate & Crop Options */}
					{isVideo && info.duration !== undefined && (
						<details className="rounded-xl border border-(--border-color) p-3">
							<summary className="cursor-pointer text-sm font-medium text-(--text-primary)">
								Video options: metadata privacy, trim, crop, rotate &amp; audio
							</summary>
							<div className="mt-3 space-y-4 border-t border-(--border-color) pt-3">
								<div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
									<label
										htmlFor={stripMetaId}
										className="branded-checkbox-label text-xs font-medium text-(--text-primary)"
									>
										<input
											id={stripMetaId}
											type="checkbox"
											checked={stripMetadata}
											disabled={busy}
											onChange={(e) => {
												setStripMetadata(e.target.checked);
												invalidateResult();
											}}
											className="h-4 w-4 rounded"
										/>
										<span>
											Strip hidden metadata &amp; creation date on export
											(Recommended)
										</span>
									</label>

									{info.hasAudio && (
										<label
											htmlFor={muteAudioId}
											className="branded-checkbox-label text-xs font-medium text-(--text-primary)"
										>
											<input
												id={muteAudioId}
												type="checkbox"
												checked={muteAudio}
												disabled={busy}
												onChange={(e) => {
													setMuteAudio(e.target.checked);
													invalidateResult();
												}}
												className="h-4 w-4 rounded"
											/>
											<span className="inline-flex items-center gap-1">
												{muteAudio ? (
													<VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
												) : (
													<Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
												)}
												Mute / remove audio track
											</span>
										</label>
									)}
								</div>

								{/* Trim Controls */}
								<div className="flex flex-wrap items-end gap-2">
									<label
										htmlFor={trimStartId}
										className="grid gap-1 text-xs text-(--text-secondary)"
									>
										Trim start (s)
										<input
											id={trimStartId}
											type="number"
											min={0}
											max={Math.max(0, effectiveTrimEnd - 0.1)}
											step={0.05}
											value={Number(trimStart.toFixed(2))}
											disabled={busy}
											onChange={(e) => {
												const next = clamp(
													Number(e.target.value) || 0,
													0,
													Math.max(0, effectiveTrimEnd - 0.1),
												);
												setTrimStart(next);
												invalidateResult();
											}}
											className="w-24 rounded-lg border border-(--border-color) bg-(--bg-canvas) px-2 py-1.5 text-sm text-(--text-primary)"
										/>
									</label>
									<label
										htmlFor={trimEndId}
										className="grid gap-1 text-xs text-(--text-secondary)"
									>
										Trim end (s)
										<input
											id={trimEndId}
											type="number"
											min={Math.min(info.duration, trimStart + 0.1)}
											max={info.duration}
											step={0.05}
											value={Number(effectiveTrimEnd.toFixed(2))}
											disabled={busy}
											onChange={(e) => {
												const next = clamp(
													Number(e.target.value) || info.duration || 0,
													Math.min(info.duration ?? 0, trimStart + 0.1),
													info.duration ?? 0,
												);
												setTrimEnd(next);
												invalidateResult();
											}}
											className="w-24 rounded-lg border border-(--border-color) bg-(--bg-canvas) px-2 py-1.5 text-sm text-(--text-primary)"
										/>
									</label>
									<button
										type="button"
										className={secondaryButton}
										disabled={busy || time >= effectiveTrimEnd - 0.05}
										onClick={() => {
											setTrimStart(time);
											invalidateResult();
										}}
									>
										<Scissors className="h-3.5 w-3.5" aria-hidden="true" />
										Set start here
									</button>
									<button
										type="button"
										className={secondaryButton}
										disabled={busy || time <= trimStart + 0.05}
										onClick={() => {
											setTrimEnd(time);
											invalidateResult();
										}}
									>
										<Scissors className="h-3.5 w-3.5" aria-hidden="true" />
										Set end here
									</button>
									{hasTrim && (
										<button
											type="button"
											className={secondaryButton}
											disabled={busy}
											onClick={() => {
												setTrimStart(0);
												setTrimEnd(info.duration ?? 0);
												invalidateResult();
											}}
										>
											Reset trim
										</button>
									)}
								</div>

								{/* Rotate, Flip & Edge Crop */}
								<div className="flex flex-wrap items-center gap-2">
									<button
										type="button"
										className={secondaryButton}
										disabled={busy}
										onClick={() => {
											setRotate(
												(prev) => ((prev + 90) % 360) as RotationDegrees,
											);
											setPositions([]);
											setCropBox(null);
											invalidateResult();
										}}
									>
										<RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
										Rotate 90° ({rotate}°)
									</button>
									<button
										type="button"
										className={secondaryButton}
										aria-pressed={flip}
										disabled={busy}
										onClick={() => {
											setFlip((prev) => !prev);
											setPositions([]);
											invalidateResult();
										}}
									>
										<FlipHorizontal2
											className="h-3.5 w-3.5"
											aria-hidden="true"
										/>
										Flip horizontal
									</button>
									<label
										htmlFor={cropToggleId}
										className="branded-checkbox-label ml-2 text-xs font-medium text-(--text-primary)"
									>
										<input
											id={cropToggleId}
											type="checkbox"
											checked={cropEnabled}
											disabled={busy}
											onChange={(e) => {
												const next = e.target.checked;
												setCropEnabled(next);
												if (next && !cropBox) {
													const insetX = Math.round(displayWidth * 0.05);
													const insetY = Math.round(displayHeight * 0.05);
													setCropBox({
														x: insetX,
														y: insetY,
														width: Math.max(2, displayWidth - insetX * 2),
														height: Math.max(2, displayHeight - insetY * 2),
													});
												}
												invalidateResult();
											}}
											className="h-4 w-4 rounded"
										/>
										<span>Crop output frame</span>
									</label>
								</div>

								{cropEnabled && cropBox && (
									<div className="flex flex-wrap items-end gap-2">
										{(["x", "y", "width", "height"] as const).map((field) => (
											<label
												key={field}
												className="grid gap-1 text-xs capitalize text-(--text-secondary)"
											>
												Crop {field} (px)
												<input
													type="number"
													min={field === "width" || field === "height" ? 2 : 0}
													max={
														field === "x" || field === "width"
															? displayWidth
															: displayHeight
													}
													value={cropBox[field]}
													disabled={busy}
													onChange={(e) => {
														const val = Math.max(
															field === "width" || field === "height" ? 2 : 0,
															Math.round(Number(e.target.value) || 0),
														);
														setCropBox((prev) =>
															prev ? { ...prev, [field]: val } : prev,
														);
														invalidateResult();
													}}
													className="w-20 rounded-lg border border-(--border-color) bg-(--bg-canvas) px-2 py-1.5 text-sm text-(--text-primary)"
												/>
											</label>
										))}
									</div>
								)}
							</div>
						</details>
					)}

					{defaultBox && (
						<details className="rounded-xl border border-(--border-color) p-3">
							<summary className="cursor-pointer text-sm font-medium text-(--text-primary)">
								Set icon selection by coordinates
							</summary>
							<form
								key={`${time}:${coordinateKeys.map((key) => defaultBox[key]).join(",")}`}
								onSubmit={applyCoordinates}
								className="mt-3 flex flex-wrap items-end gap-2"
							>
								{coordinateKeys.map((key) => (
									<label
										key={key}
										className="grid gap-1 text-xs capitalize text-(--text-secondary)"
									>
										{key} (px)
										<input
											name={key}
											type="number"
											defaultValue={defaultBox[key]}
											min={key === "width" || key === "height" ? 1 : 0}
											max={
												key === "x" || key === "width"
													? displayWidth
													: displayHeight
											}
											required
											disabled={!canEdit}
											className="w-20 rounded-lg border border-(--border-color) bg-(--bg-canvas) px-2 py-1.5 text-sm text-(--text-primary)"
										/>
									</label>
								))}
								<button
									type="submit"
									disabled={!canEdit}
									className={secondaryButton}
								>
									Set box
								</button>
							</form>
						</details>
					)}

					<div className="flex flex-wrap items-center gap-2">
						{result && resultUrl ? (
							<a
								className={primaryButton}
								href={resultUrl}
								download={buildCleanedFilename(
									file.name,
									"_edited",
									resultExtension,
								)}
							>
								<Download className="h-4 w-4" aria-hidden="true" />
								Download {resultExtension.toUpperCase()}
							</a>
						) : (
							<>
								<button
									type="button"
									className={primaryButton}
									disabled={
										isVideo ? !canExportVideo || !canEdit : !region || !canEdit
									}
									onClick={() => void exportFile(false)}
								>
									{busy
										? "Exporting…"
										: isVideo
											? "Export video"
											: "Export PNG"}
								</button>
								{isVideo && canDirectDiskSave && !busy && (
									<button
										type="button"
										className={secondaryButton}
										disabled={!canExportVideo || !canEdit}
										onClick={() => void exportFile(true)}
									>
										<HardDriveDownload className="h-4 w-4" aria-hidden="true" />
										Save directly to disk
									</button>
								)}
							</>
						)}
						{busy && isVideo ? (
							<button
								type="button"
								className={secondaryButton}
								onClick={() => exportJob.current?.abort()}
							>
								Cancel export
							</button>
						) : (
							positions.length > 0 && (
								<button
									type="button"
									className={secondaryButton}
									disabled={!canEdit || (isVideo && !selectedPosition)}
									onClick={() => {
										const remaining = positions.filter(
											(position) => Math.abs(position.time - time) >= 0.005,
										);
										setPositions(remaining);
										if (remaining.length === 0) setEdited(false);
										invalidateResult();
										setError("");
									}}
								>
									<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
									{isVideo ? "Remove position" : "Clear box"}
								</button>
							)
						)}
					</div>

					{busy && isVideo && (
						<div className="space-y-1">
							<p role="status" className="m-0 text-xs text-(--text-secondary)">
								Exporting in background worker ({progress}%)…
							</p>
							<progress
								aria-label="Video export progress"
								value={progress}
								max={100}
								className="w-full accent-(--brand-color)"
							/>
						</div>
					)}

					{savedToDiskMessage && (
						<p
							role="status"
							className="m-0 text-sm font-medium text-(--success-color)"
						>
							{savedToDiskMessage}
						</p>
					)}
				</>
			) : (
				!error && (
					<p role="status" className="text-sm text-(--text-secondary)">
						Opening file…
					</p>
				)
			)}
			{error && (
				<p role="alert" className="m-0 text-sm text-(--danger-color)">
					{error}
				</p>
			)}
		</section>
	);
}
