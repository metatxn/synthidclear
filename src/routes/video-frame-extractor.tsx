import { createFileRoute } from "@tanstack/react-router";
import {
	Camera,
	ChevronLeft,
	ChevronRight,
	Download,
	Images,
} from "lucide-react";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import { UploadDropzone } from "#/components/UploadDropzone";
import { buildCleanedFilename, VIDEO_ACCEPT } from "#/lib/format";
import { clamp } from "#/lib/iconRemoval";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";
import {
	type FilmstripFrame,
	type VideoPreviewMetadata,
	VideoPreviewSession,
} from "#/lib/videoPreviewSession";
import { exportCanvasFrameBlob } from "#/lib/videoTools";
import { createZipBlob } from "#/lib/zip";

const PATH = "/video-frame-extractor";
const TITLE = "Clean Video Frame Extractor";
const DESCRIPTION =
	"Extract full-resolution, metadata-free PNG, JPEG, or WebP still images from any exact frame of an MP4, MOV, WebM, or MKV video locally in your browser.";

const FAQS: readonly FaqItem[] = [
	{
		question: "Do extracted video frames contain EXIF, GPS, or AI metadata?",
		answer:
			"No. Every still frame is rendered straight from the decoded pixel buffer onto a fresh canvas with zero EXIF, GPS, XMP, or C2PA tags attached.",
	},
	{
		question: "Can I step frame-by-frame to capture the sharpest moment?",
		answer:
			"Yes. SynthIDClear decodes exact timestamps via WebCodecs and gives you a visual filmstrip plus -1 frame and +1 frame buttons based on the video's true FPS.",
	},
	{
		question: "Can I export multiple thumbnails from a video at once?",
		answer:
			"Yes. Click Download 10-Frame Thumbnail Pack (ZIP) to save all evenly spaced filmstrip stills as clean image files in one click.",
	},
];

type FrameOutputMime = "image/png" | "image/jpeg" | "image/webp";

export const Route = createFileRoute("/video-frame-extractor")({
	head: () =>
		buildRouteHead({
			title: `${TITLE} (No Upload, Zero Metadata) | SynthIDClear`,
			description: DESCRIPTION,
			path: PATH,
		}),
	component: VideoFrameExtractorPage,
});

function VideoFrameExtractorPage() {
	const [file, setFile] = useState<File | null>(null);
	const [meta, setMeta] = useState<VideoPreviewMetadata | null>(null);
	const [filmstrip, setFilmstrip] = useState<FilmstripFrame[]>([]);
	const [time, setTime] = useState(0);
	const [outputMime, setOutputMime] = useState<FrameOutputMime>("image/png");
	const [busyZip, setBusyZip] = useState(false);
	const [statusMsg, setStatusMsg] = useState("");
	const [error, setError] = useState("");

	const sliderId = useId();
	const formatId = useId();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const sessionRef = useRef<VideoPreviewSession | null>(null);
	const currentFrameRef = useRef<HTMLCanvasElement | OffscreenCanvas | null>(
		null,
	);
	const seekTokenRef = useRef(0);

	const drawFrame = useCallback(
		(source: HTMLCanvasElement | OffscreenCanvas, w: number, h: number) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			ctx.clearRect(0, 0, w, h);
			ctx.drawImage(source, 0, 0, w, h);
		},
		[],
	);

	useEffect(() => {
		if (!file) return;
		const abortController = new AbortController();
		let activeSession: VideoPreviewSession | null = null;
		const createdUrls: string[] = [];

		setMeta(null);
		setFilmstrip([]);
		setError("");
		setStatusMsg("");

		void VideoPreviewSession.open(file)
			.then(async (session) => {
				if (abortController.signal.aborted) {
					session.dispose();
					return;
				}
				activeSession = session;
				sessionRef.current = session;
				setMeta(session.metadata);
				setTime(0);

				const first = await session.getFrameCanvas(0);
				if (!abortController.signal.aborted && first) {
					currentFrameRef.current = first;
					drawFrame(first, session.metadata.width, session.metadata.height);
				}

				const strip = await session.generateFilmstrip(
					10,
					160,
					abortController.signal,
				);
				for (const item of strip) createdUrls.push(item.url);
				if (!abortController.signal.aborted) {
					setFilmstrip(strip);
				}
			})
			.catch((err) => {
				if (!abortController.signal.aborted) {
					setError(
						err instanceof Error
							? err.message
							: "Could not open this video in your browser.",
					);
				}
			});

		return () => {
			abortController.abort();
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
	}, [drawFrame, file]);

	const seekTo = useCallback(
		(targetTime: number) => {
			const session = sessionRef.current;
			if (!session || !meta) return;
			const clamped = clamp(targetTime, 0, meta.duration);
			setTime(clamped);
			const token = ++seekTokenRef.current;
			void session.getFrameCanvas(clamped).then((frame) => {
				if (token !== seekTokenRef.current || !frame) return;
				currentFrameRef.current = frame;
				drawFrame(frame, meta.width, meta.height);
			});
		},
		[drawFrame, meta],
	);

	async function handleDownloadCurrentFrame() {
		const frame = currentFrameRef.current ?? canvasRef.current;
		if (!file || !frame) return;
		setError("");
		try {
			const blob = await exportCanvasFrameBlob(frame, outputMime, 0.94);
			const ext =
				outputMime === "image/jpeg"
					? "jpg"
					: outputMime === "image/webp"
						? "webp"
						: "png";
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = buildCleanedFilename(
				file.name,
				`_frame_${time.toFixed(2)}s`,
				ext,
			);
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			setStatusMsg(
				`Downloaded clean ${ext.toUpperCase()} frame at ${time.toFixed(2)} s.`,
			);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to save frame image.",
			);
		}
	}

	async function handleDownloadPackZip() {
		const session = sessionRef.current;
		if (!file || !session || !meta || busyZip) return;
		setBusyZip(true);
		setError("");
		setStatusMsg("");
		try {
			const ext =
				outputMime === "image/jpeg"
					? "jpg"
					: outputMime === "image/webp"
						? "webp"
						: "png";
			const entries: Array<{ name: string; data: Uint8Array }> = [];
			const count = 10;
			for (let i = 0; i < count; i++) {
				const ts = (meta.duration * i) / (count - 1);
				const canvas = await session.getFrameCanvas(
					Math.min(ts, Math.max(0, meta.duration - 0.02)),
				);
				if (!canvas) continue;
				const blob = await exportCanvasFrameBlob(canvas, outputMime, 0.9);
				const data = new Uint8Array(await blob.arrayBuffer());
				entries.push({
					name: buildCleanedFilename(
						file.name,
						`_still_${String(i + 1).padStart(2, "0")}`,
						ext,
					),
					data,
				});
			}
			if (entries.length === 0) {
				throw new Error("Could not extract frames from this video.");
			}
			const zipBlob = createZipBlob(entries);
			const url = URL.createObjectURL(zipBlob);
			const a = document.createElement("a");
			a.href = url;
			a.download = buildCleanedFilename(file.name, "_frames", "zip");
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1500);
			setStatusMsg(
				`Saved ${entries.length} full-resolution clean frames as ZIP.`,
			);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create frame pack ZIP.",
			);
		} finally {
			setBusyZip(false);
		}
	}

	const progressPct =
		meta && meta.duration > 0 ? clamp((time / meta.duration) * 100, 0, 100) : 0;

	return (
		<div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "All Free Tools", path: "/tools" },
					{ name: TITLE, path: PATH },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: `SynthIDClear — ${TITLE}`,
					description: DESCRIPTION,
					path: PATH,
				})}
			/>
			<JsonLd data={buildFaqSchema(FAQS)} />

			<header className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
				<h1 className="m-0 text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-(--text-primary) sm:text-4xl">
					Clean Video Frame Extractor
				</h1>
				<p className="mx-auto my-0 max-w-2xl text-base leading-relaxed text-pretty text-(--text-secondary)">
					Scrub frame-by-frame through any MP4, MOV, WebM, or MKV video and
					export full-resolution, metadata-free PNG, JPEG, or WebP still images
					— 100% locally in your browser.
				</p>
			</header>

			{!file ? (
				<UploadDropzone
					accept={VIDEO_ACCEPT}
					singleFile
					hideSampleButton
					filterFiles={(list) =>
						Array.from(list).filter(
							(f) =>
								f.type.startsWith("video/") ||
								/\.(mp4|mov|webm|mkv)$/i.test(f.name),
						)
					}
					heading="Drop a video to extract clean still frames"
					subtext="MP4, MOV, WebM, or MKV · Frame-accurate WebCodecs decoding · Zero metadata"
					onFilesAdded={([picked]) => {
						if (!picked) return;
						setFile(picked);
					}}
				/>
			) : (
				<section
					aria-label="Video frame extraction workspace"
					className="space-y-4 rounded-2xl border border-(--border-color) bg-(--bg-card) p-4 sm:p-6"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="m-0 truncate text-sm font-semibold text-(--text-primary)">
								{file.name}
							</p>
							{meta && (
								<p className="tabular mt-0.5 mb-0 text-xs text-(--text-secondary)">
									{meta.width} × {meta.height} px · {meta.duration.toFixed(2)} s
									· {meta.fps} fps
								</p>
							)}
						</div>
						<button
							type="button"
							disabled={busyZip}
							onClick={() => {
								setFile(null);
								setMeta(null);
								setError("");
								setStatusMsg("");
							}}
							className="touch-target cursor-pointer rounded-lg border border-(--border-color) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--text-primary)"
						>
							Choose another video
						</button>
					</div>

					<div className="grid place-items-center overflow-hidden rounded-xl border border-(--border-color) bg-black">
						<canvas
							ref={canvasRef}
							aria-label="Selected video frame preview"
							className="block max-h-[min(60vh,30rem)] max-w-full"
						/>
					</div>

					{meta && (
						<div className="space-y-3 rounded-xl border border-(--border-color) bg-(--bg-surface)/60 p-3">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex items-center gap-1.5">
									<button
										type="button"
										disabled={time <= 0}
										onClick={() => seekTo(time - meta.frameDuration)}
										aria-label="Previous frame"
										className="touch-target inline-flex cursor-pointer items-center gap-1 rounded-lg border border-(--border-color) bg-(--bg-card) px-2.5 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--text-primary) disabled:opacity-45"
									>
										<ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
										-1f
									</button>
									<button
										type="button"
										disabled={time >= meta.duration}
										onClick={() => seekTo(time + meta.frameDuration)}
										aria-label="Next frame"
										className="touch-target inline-flex cursor-pointer items-center gap-1 rounded-lg border border-(--border-color) bg-(--bg-card) px-2.5 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--text-primary) disabled:opacity-45"
									>
										+1f
										<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
									</button>
								</div>

								<label
									htmlFor={sliderId}
									className="tabular text-xs font-semibold text-(--text-primary)"
								>
									{time.toFixed(2)} s / {meta.duration.toFixed(2)} s
								</label>
							</div>

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
												onClick={() => seekTo(frame.time)}
												aria-label={`Jump to ${frame.time.toFixed(2)} seconds`}
												className="block h-12 cursor-pointer overflow-hidden border-0 bg-transparent p-0 focus-visible:z-10"
											>
												<img
													src={frame.url}
													alt=""
													className="h-full w-full object-cover opacity-90 hover:opacity-100"
												/>
											</button>
										))}
									</div>
									<span
										aria-hidden="true"
										className="pointer-events-none absolute inset-y-0 w-0.5 bg-(--brand-color)"
										style={{ left: `${progressPct}%` }}
									/>
								</div>
							)}

							<input
								id={sliderId}
								type="range"
								min={0}
								max={meta.duration}
								step="any"
								value={time}
								onChange={(e) => seekTo(Number(e.target.value))}
								style={
									{ "--range-progress": `${progressPct}%` } as CSSProperties
								}
								className="branded-range w-full cursor-pointer accent-(--brand-color)"
							/>
						</div>
					)}

					<div className="flex flex-wrap items-center gap-3">
						<label
							htmlFor={formatId}
							className="flex items-center gap-2 text-xs font-medium text-(--text-secondary)"
						>
							Image format
							<select
								id={formatId}
								value={outputMime}
								disabled={busyZip}
								onChange={(e) =>
									setOutputMime(e.target.value as FrameOutputMime)
								}
								className="rounded-lg border border-(--border-color) bg-(--bg-surface) px-2.5 py-1.5 text-xs font-medium text-(--text-primary)"
							>
								<option value="image/png">PNG (Lossless)</option>
								<option value="image/jpeg">JPEG (94%)</option>
								<option value="image/webp">WebP (94%)</option>
							</select>
						</label>

						<button
							type="button"
							disabled={!meta || busyZip}
							onClick={() => void handleDownloadCurrentFrame()}
							className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-xl bg-(--brand-color) px-4 py-2 text-sm font-semibold text-(--brand-text) hover:bg-(--brand-hover) disabled:opacity-50"
						>
							<Camera className="h-4 w-4" aria-hidden="true" />
							Download Current Frame
						</button>

						<button
							type="button"
							disabled={!meta || busyZip}
							onClick={() => void handleDownloadPackZip()}
							className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-xl border border-(--border-color) bg-(--bg-surface) px-4 py-2 text-sm font-medium text-(--text-primary) hover:border-(--text-primary) disabled:opacity-50"
						>
							{busyZip ? (
								<>
									<Download className="h-4 w-4" aria-hidden="true" />
									Packing 10 frames…
								</>
							) : (
								<>
									<Images className="h-4 w-4" aria-hidden="true" />
									Download 10-Frame Pack (ZIP)
								</>
							)}
						</button>
					</div>

					{statusMsg && (
						<p
							role="status"
							className="m-0 text-xs font-medium text-(--success-color)"
						>
							{statusMsg}
						</p>
					)}
					{error && (
						<p role="alert" className="m-0 text-sm text-(--danger-color)">
							{error}
						</p>
					)}
				</section>
			)}

			<FaqAccordion heading="Common questions" items={FAQS} />
		</div>
	);
}
