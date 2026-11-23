import { createFileRoute } from "@tanstack/react-router";
import { Download, Music, VolumeX } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import { UploadDropzone } from "#/components/UploadDropzone";
import { buildCleanedFilename, formatBytes, VIDEO_ACCEPT } from "#/lib/format";
import { toSafeBlobUrl } from "#/lib/safeUrl";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";
import {
	type AudioExtractFormat,
	extractCleanAudioFromVideo,
	muteVideoLossless,
	type VideoToolResult,
} from "#/lib/videoTools";

const PATH = "/mute-extract-audio";
const TITLE = "Mute Video & Extract Clean Audio";
const DESCRIPTION =
	"Instantly remove background audio from videos with zero video re-encoding, or extract a clean, metadata-free audio track (M4A, OGG, MP3, FLAC, or WAV) locally in your browser.";

const FAQS: readonly FaqItem[] = [
	{
		question: "Does muting a video re-encode or reduce video quality?",
		answer:
			"No. Removing the audio track copies the original video stream bit-for-bit while stripping hidden container metadata — so it finishes in under a second with 0% quality loss.",
	},
	{
		question: "What format does Extract Clean Audio output?",
		answer:
			"In Lossless mode, SynthIDClear copies the exact embedded audio codec into its native container (M4A for AAC, OGG for Opus/Vorbis, MP3, FLAC, or WAV) with zero re-encoding. You can also export universal uncompressed WAV.",
	},
	{
		question: "Why remove audio from a video before sharing?",
		answer:
			"Background voices, phone notifications, and ambient noises in screen recordings or camera clips can unintentionally leak private conversations or personal details.",
	},
];

export const Route = createFileRoute("/mute-extract-audio")({
	head: () =>
		buildRouteHead({
			title: `${TITLE} (Lossless, No Upload) | SynthIDClear`,
			description: DESCRIPTION,
			path: PATH,
		}),
	component: MuteExtractAudioPage,
});

function MuteExtractAudioPage() {
	const [file, setFile] = useState<File | null>(null);
	const [mode, setMode] = useState<"mute" | "extract">("mute");
	const [extractFormat, setExtractFormat] =
		useState<AudioExtractFormat>("lossless");
	const [stripMetadata, setStripMetadata] = useState(true);
	const [progress, setProgress] = useState<number>();
	const [result, setResult] = useState<VideoToolResult | null>(null);
	const [resultUrl, setResultUrl] = useState("");
	const [error, setError] = useState("");

	const extractFmtId = useId();
	const stripId = useId();
	const jobRef = useRef<AbortController | null>(null);
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

	async function handleRun() {
		if (!file || busy) return;
		const controller = new AbortController();
		jobRef.current = controller;
		setError("");
		setResult(null);
		setProgress(0);

		try {
			const res =
				mode === "mute"
					? await muteVideoLossless(
							file,
							stripMetadata,
							controller.signal,
							setProgress,
						)
					: await extractCleanAudioFromVideo(
							file,
							extractFormat,
							stripMetadata,
							controller.signal,
							setProgress,
						);
			if (!controller.signal.aborted) {
				setResult(res);
			}
		} catch (err) {
			if (!controller.signal.aborted) {
				setError(
					err instanceof Error ? err.message : "Processing could not finish.",
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
					Mute Video &amp; Extract Clean Audio
				</h1>
				<p className="mx-auto my-0 max-w-2xl text-base leading-relaxed text-pretty text-(--text-secondary)">
					Strip private background audio from a video losslessly with zero
					re-encoding, or extract a clean, metadata-free audio track directly in
					your browser.
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
					heading="Drop a video to mute or extract audio"
					subtext="MP4, MOV, MKV, or WebM · Instant lossless stream copy · Stays on your device"
					onFilesAdded={([picked]) => {
						if (!picked) return;
						setFile(picked);
						setResult(null);
						setError("");
					}}
				/>
			) : (
				<section
					aria-label="Mute video and audio extraction workspace"
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

					<fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
						<legend className="visually-hidden">Action mode</legend>
						<button
							type="button"
							disabled={busy}
							aria-pressed={mode === "mute"}
							onClick={() => {
								setMode("mute");
								setResult(null);
							}}
							className={`touch-target inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
								mode === "mute"
									? "border-(--brand-color) bg-(--bg-surface) text-(--text-primary)"
									: "border-(--border-color) bg-(--bg-card) text-(--text-secondary) hover:text-(--text-primary)"
							}`}
						>
							<VolumeX className="h-4 w-4" aria-hidden="true" />
							Remove Audio (Mute Video)
						</button>
						<button
							type="button"
							disabled={busy}
							aria-pressed={mode === "extract"}
							onClick={() => {
								setMode("extract");
								setResult(null);
							}}
							className={`touch-target inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
								mode === "extract"
									? "border-(--brand-color) bg-(--bg-surface) text-(--text-primary)"
									: "border-(--border-color) bg-(--bg-card) text-(--text-secondary) hover:text-(--text-primary)"
							}`}
						>
							<Music className="h-4 w-4" aria-hidden="true" />
							Extract Clean Audio Track
						</button>
					</fieldset>

					<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
						{mode === "extract" && (
							<label
								htmlFor={extractFmtId}
								className="flex items-center gap-2 text-xs font-medium text-(--text-secondary)"
							>
								Audio output
								<select
									id={extractFmtId}
									value={extractFormat}
									disabled={busy}
									onChange={(e) => {
										setExtractFormat(e.target.value as AudioExtractFormat);
										setResult(null);
									}}
									className="rounded-lg border border-(--border-color) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-primary)"
								>
									<option value="lossless">
										Original codec (Lossless copy — M4A/OGG/MP3/FLAC)
									</option>
									<option value="wav">Uncompressed WAV (Universal)</option>
								</select>
							</label>
						)}

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
					</div>

					<div className="flex flex-wrap items-center gap-2.5">
						<button
							type="button"
							disabled={busy}
							onClick={() => void handleRun()}
							className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-xl bg-(--brand-color) px-4 py-2.5 text-sm font-semibold text-(--brand-text) hover:bg-(--brand-hover) disabled:opacity-50"
						>
							{mode === "mute" ? (
								<>
									<VolumeX className="h-4 w-4" aria-hidden="true" />
									{busy ? `Muting (${progress}%)…` : "Mute Video (Lossless)"}
								</>
							) : (
								<>
									<Music className="h-4 w-4" aria-hidden="true" />
									{busy ? `Extracting (${progress}%)…` : "Extract Clean Audio"}
								</>
							)}
						</button>

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
						<progress
							aria-label="Media processing progress"
							value={progress}
							max={100}
							className="w-full accent-(--brand-color)"
						/>
					)}

					{result && resultUrl && (
						<div
							role="status"
							className="space-y-3 rounded-xl border border-(--success-color)/30 bg-(--success-color)/10 p-4"
						>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div className="text-xs">
									<p className="m-0 font-semibold text-(--success-color)">
										{mode === "mute"
											? "Audio track removed cleanly (0% video quality loss)"
											: `Extracted clean ${result.extension.toUpperCase()} audio`}
									</p>
									<p className="tabular mt-0.5 mb-0 text-(--text-secondary)">
										{formatBytes(result.originalSize)} →{" "}
										<strong className="text-(--text-primary)">
											{formatBytes(result.outputSize)}
										</strong>
									</p>
								</div>

								<a
									href={toSafeBlobUrl(resultUrl)}
									download={buildCleanedFilename(
										file.name,
										mode === "mute" ? "_muted" : "_audio",
										result.extension,
									)}
									className="touch-target inline-flex items-center gap-2 rounded-xl bg-(--brand-color) px-4 py-2 text-sm font-semibold text-(--brand-text) no-underline hover:bg-(--brand-hover)"
								>
									<Download className="h-4 w-4" aria-hidden="true" />
									Download {result.extension.toUpperCase()}
								</a>
							</div>

							{mode === "extract" && (
								<audio
									src={toSafeBlobUrl(resultUrl)}
									controls
									className="w-full"
									aria-label="Extracted audio preview"
								>
									<track kind="captions" />
								</audio>
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
