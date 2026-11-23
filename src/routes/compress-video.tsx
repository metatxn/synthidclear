import { createFileRoute } from "@tanstack/react-router";
import { Download, HardDriveDownload, Shrink } from "lucide-react";
import type { QualityLevel } from "mediabunny";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import { UploadDropzone } from "#/components/UploadDropzone";
import {
	buildCleanedFilename,
	formatBytes,
	formatDeltaPercent,
	VIDEO_ACCEPT,
} from "#/lib/format";
import {
	pickVideoSaveHandle,
	supportsDirectDiskSave,
} from "#/lib/iconVideoExport";
import { toSafeBlobUrl } from "#/lib/safeUrl";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";
import {
	compressOrConvertVideo,
	type VideoCompressContainer,
	type VideoFpsCap,
	type VideoResolutionCap,
	type VideoToolResult,
} from "#/lib/videoTools";

const PATH = "/compress-video";
const TITLE = "Clean Video Compressor & Converter";
const DESCRIPTION =
	"Compress and convert MOV, MKV, WebM, and MP4 videos to lightweight, metadata-free MP4 or WebM right in your browser with zero uploads.";

const FAQS: readonly FaqItem[] = [
	{
		question: "Does compressing a video also remove hidden metadata?",
		answer:
			"Yes. By default SynthIDClear strips descriptive container metadata tags, GPS location, camera info, and creation timestamps while converting your clip.",
	},
	{
		question: "Can I convert iPhone MOV or MKV files to MP4 locally?",
		answer:
			"Yes. Drop any MP4, MOV, MKV, or WebM file, select MP4 (Fast Start) output, choose your quality and resolution cap, and export directly on your device using WebCodecs.",
	},
	{
		question: "How can I export large 4K videos without running out of memory?",
		answer:
			"On browsers that support the File System Access API (Chrome and Edge), click Save directly to disk so encoded chunks stream straight to your drive instead of staying in RAM.",
	},
];

export const Route = createFileRoute("/compress-video")({
	head: () =>
		buildRouteHead({
			title: `${TITLE} (MOV/MKV to MP4, No Upload) | SynthIDClear`,
			description: DESCRIPTION,
			path: PATH,
		}),
	component: CompressVideoPage,
});

function CompressVideoPage() {
	const [file, setFile] = useState<File | null>(null);
	const [container, setContainer] = useState<VideoCompressContainer>("mp4");
	const [quality, setQuality] = useState<QualityLevel>("medium");
	const [maxHeight, setMaxHeight] = useState<VideoResolutionCap>("1080");
	const [maxFps, setMaxFps] = useState<VideoFpsCap>("original");
	const [muteAudio, setMuteAudio] = useState(false);
	const [stripMetadata, setStripMetadata] = useState(true);
	const [progress, setProgress] = useState<number>();
	const [result, setResult] = useState<VideoToolResult | null>(null);
	const [resultUrl, setResultUrl] = useState("");
	const [error, setError] = useState("");

	const containerId = useId();
	const qualityId = useId();
	const resolutionId = useId();
	const fpsId = useId();
	const stripId = useId();
	const muteId = useId();
	const jobRef = useRef<AbortController | null>(null);
	const canDirectSave = useMemo(() => supportsDirectDiskSave(), []);
	const busy = progress !== undefined;

	useEffect(() => {
		if (!result?.blob) {
			setResultUrl("");
			return;
		}
		const url = URL.createObjectURL(result.blob);
		setResultUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [result]);

	useEffect(() => () => jobRef.current?.abort(), []);

	async function handleConvert(directToDisk: boolean) {
		if (!file || busy) return;
		let saveFileHandle: FileSystemFileHandle | undefined;
		if (directToDisk) {
			const mime = container === "webm" ? "video/webm" : "video/mp4";
			const picked = await pickVideoSaveHandle(
				buildCleanedFilename(file.name, "_compressed", container),
				container,
				mime,
			);
			if (!picked) return;
			saveFileHandle = picked;
		}

		const controller = new AbortController();
		jobRef.current = controller;
		setError("");
		setResult(null);
		setProgress(0);

		try {
			const res = await compressOrConvertVideo(
				file,
				{
					container,
					quality,
					maxHeight,
					maxFps,
					muteAudio,
					stripMetadata,
					saveFileHandle,
				},
				controller.signal,
				setProgress,
			);
			if (!controller.signal.aborted) {
				setResult(res);
			}
		} catch (err) {
			if (!controller.signal.aborted) {
				setError(
					err instanceof Error ? err.message : "Video conversion failed.",
				);
			}
		} finally {
			if (jobRef.current === controller) {
				jobRef.current = null;
				setProgress(undefined);
			}
		}
	}

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
					Clean Video Compressor &amp; Converter
				</h1>
				<p className="mx-auto my-0 max-w-2xl text-base leading-relaxed text-pretty text-(--text-secondary)">
					Convert MOV, MKV, WebM, or large MP4 clips into compact, web-ready MP4
					or WebM files with hidden metadata and timestamps automatically
					stripped — 100% locally in your browser.
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
					heading="Drop a video to compress or convert"
					subtext="MP4, MOV, MKV, or WebM · Hardware-accelerated WebCodecs · Zero uploads"
					onFilesAdded={([picked]) => {
						if (!picked) return;
						setFile(picked);
						setResult(null);
						setError("");
					}}
				/>
			) : (
				<section
					aria-label="Video compression workspace"
					className="space-y-5 rounded-2xl border border-(--border-color) bg-(--bg-card) p-4 sm:p-6"
				>
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border-color) pb-4">
						<div className="min-w-0">
							<p className="m-0 truncate text-sm font-semibold text-(--text-primary)">
								{file.name}
							</p>
							<p className="tabular mt-0.5 mb-0 text-xs text-(--text-secondary)">
								Original size: {formatBytes(file.size)}
							</p>
						</div>
						<button
							type="button"
							disabled={busy}
							onClick={() => {
								setFile(null);
								setResult(null);
								setError("");
							}}
							className="touch-target cursor-pointer rounded-lg border border-(--border-color) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--text-primary) disabled:opacity-50"
						>
							Choose another video
						</button>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<label
							htmlFor={containerId}
							className="grid gap-1.5 text-xs font-medium text-(--text-secondary)"
						>
							Output format
							<select
								id={containerId}
								value={container}
								disabled={busy}
								onChange={(e) => {
									setContainer(e.target.value as VideoCompressContainer);
									setResult(null);
								}}
								className="rounded-lg border border-(--border-color) bg-(--bg-surface) px-3 py-2 text-sm text-(--text-primary)"
							>
								<option value="mp4">MP4 (Fast Start)</option>
								<option value="webm">WebM</option>
							</select>
						</label>

						<label
							htmlFor={qualityId}
							className="grid gap-1.5 text-xs font-medium text-(--text-secondary)"
						>
							Quality preset
							<select
								id={qualityId}
								value={quality}
								disabled={busy}
								onChange={(e) => {
									setQuality(e.target.value as QualityLevel);
									setResult(null);
								}}
								className="rounded-lg border border-(--border-color) bg-(--bg-surface) px-3 py-2 text-sm text-(--text-primary)"
							>
								<option value="very-low">Smallest file (Very Low)</option>
								<option value="low">Compact (Low)</option>
								<option value="medium">Balanced (Medium)</option>
								<option value="high">Crisp (High)</option>
								<option value="very-high">Archival (Very High)</option>
							</select>
						</label>

						<label
							htmlFor={resolutionId}
							className="grid gap-1.5 text-xs font-medium text-(--text-secondary)"
						>
							Max resolution
							<select
								id={resolutionId}
								value={maxHeight}
								disabled={busy}
								onChange={(e) => {
									setMaxHeight(e.target.value as VideoResolutionCap);
									setResult(null);
								}}
								className="rounded-lg border border-(--border-color) bg-(--bg-surface) px-3 py-2 text-sm text-(--text-primary)"
							>
								<option value="original">Keep original</option>
								<option value="1080">1080p max</option>
								<option value="720">720p max</option>
								<option value="480">480p max</option>
							</select>
						</label>

						<label
							htmlFor={fpsId}
							className="grid gap-1.5 text-xs font-medium text-(--text-secondary)"
						>
							Frame rate cap
							<select
								id={fpsId}
								value={maxFps}
								disabled={busy}
								onChange={(e) => {
									setMaxFps(e.target.value as VideoFpsCap);
									setResult(null);
								}}
								className="rounded-lg border border-(--border-color) bg-(--bg-surface) px-3 py-2 text-sm text-(--text-primary)"
							>
								<option value="original">Keep original FPS</option>
								<option value="30">30 fps</option>
								<option value="24">24 fps</option>
							</select>
						</label>
					</div>

					<div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
						<label
							htmlFor={stripId}
							className="branded-checkbox-label text-xs font-medium text-(--text-primary)"
						>
							<input
								id={stripId}
								type="checkbox"
								checked={stripMetadata}
								disabled={busy}
								onChange={(e) => {
									setStripMetadata(e.target.checked);
									setResult(null);
								}}
								className="h-4 w-4 rounded"
							/>
							<span>Strip hidden metadata &amp; creation date</span>
						</label>

						<label
							htmlFor={muteId}
							className="branded-checkbox-label text-xs font-medium text-(--text-primary)"
						>
							<input
								id={muteId}
								type="checkbox"
								checked={muteAudio}
								disabled={busy}
								onChange={(e) => {
									setMuteAudio(e.target.checked);
									setResult(null);
								}}
								className="h-4 w-4 rounded"
							/>
							<span>Remove audio track</span>
						</label>
					</div>

					<div className="flex flex-wrap items-center gap-2.5">
						<button
							type="button"
							disabled={busy}
							onClick={() => void handleConvert(false)}
							className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-xl bg-(--brand-color) px-4 py-2.5 text-sm font-semibold text-(--brand-text) hover:bg-(--brand-hover) disabled:opacity-50"
						>
							<Shrink className="h-4 w-4" aria-hidden="true" />
							{busy
								? `Compressing (${progress}%)…`
								: `Compress to ${container.toUpperCase()}`}
						</button>

						{canDirectSave && !busy && (
							<button
								type="button"
								onClick={() => void handleConvert(true)}
								className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-xl border border-(--border-color) bg-(--bg-surface) px-4 py-2.5 text-sm font-medium text-(--text-primary) hover:border-(--text-primary)"
							>
								<HardDriveDownload className="h-4 w-4" aria-hidden="true" />
								Save directly to disk
							</button>
						)}

						{busy && (
							<button
								type="button"
								onClick={() => jobRef.current?.abort()}
								className="touch-target cursor-pointer rounded-xl border border-(--border-color) bg-(--bg-surface) px-3 py-2 text-sm font-medium text-(--text-primary)"
							>
								Cancel
							</button>
						)}
					</div>

					{busy && (
						<div className="space-y-1">
							<p role="status" className="m-0 text-xs text-(--text-secondary)">
								Encoding video locally ({progress}%)…
							</p>
							<progress
								aria-label="Video compression progress"
								value={progress}
								max={100}
								className="w-full accent-(--brand-color)"
							/>
						</div>
					)}

					{result && (
						<div
							role="status"
							className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--success-color)/30 bg-(--success-color)/10 px-4 py-3"
						>
							<div className="space-y-0.5 text-xs">
								<p className="m-0 font-semibold text-(--success-color)">
									{result.streamedToDisk
										? `Saved clean ${result.extension.toUpperCase()} directly to disk`
										: `Ready — clean ${result.extension.toUpperCase()} created`}
								</p>
								<p className="tabular m-0 text-(--text-secondary)">
									{formatBytes(result.originalSize)} →{" "}
									<strong className="text-(--text-primary)">
										{formatBytes(result.outputSize)}
									</strong>{" "}
									({formatDeltaPercent(result.originalSize, result.outputSize)})
								</p>
							</div>
							{resultUrl && (
								<a
									href={toSafeBlobUrl(resultUrl)}
									download={buildCleanedFilename(
										file.name,
										"_compressed",
										result.extension,
									)}
									className="touch-target inline-flex items-center gap-2 rounded-xl bg-(--brand-color) px-4 py-2 text-sm font-semibold text-(--brand-text) no-underline hover:bg-(--brand-hover)"
								>
									<Download className="h-4 w-4" aria-hidden="true" />
									Download {result.extension.toUpperCase()}
								</a>
							)}
						</div>
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
