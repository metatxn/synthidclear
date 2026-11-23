import {
	AlertTriangle,
	Camera,
	CheckCircle2,
	ChevronDown,
	Download,
	FileImage,
	FileText,
	Film,
	Info,
	Loader2,
	MapPin,
	Music,
	Pause,
	Play,
	Plus,
	RotateCcw,
	Shield,
	SlidersHorizontal,
	Sparkles,
	X,
} from "lucide-react";
import {
	type DragEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ACCEPTED_MEDIA_ACCEPT,
	filterAcceptedMediaFiles,
	formatBytes,
} from "#/lib/format";
import {
	analyzeCreatorImpact,
	type CleanOptions,
	isAudioFormat,
	isPdfFormat,
	isVideoFormat,
} from "#/lib/metadata";
import { toSafeBlobUrl } from "#/lib/safeUrl";
import { type CleanerState, useCleanerState } from "#/lib/useCleanerState";
import { AdvancedOptionsPanel } from "./ExportSettingsBar";
import { BatchQueueStrip } from "./FileQueueCard";
import { RawMetadataPanel } from "./MetadataInspector";
import { UploadDropzone } from "./UploadDropzone";

function formatMediaDuration(seconds: number): string {
	const total = Math.max(0, Math.round(seconds));
	const hrs = Math.floor(total / 3600);
	const mins = Math.floor((total % 3600) / 60);
	const secs = total % 60;
	if (hrs > 0) {
		return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
	}
	return `${mins}:${String(secs).padStart(2, "0")}`;
}

interface CleanerWorkspaceProps {
	externalState?: CleanerState;
	hideDropzone?: boolean;
	hideScopeBanner?: boolean;
	defaultOptions?: Partial<CleanOptions>;
	defaultOptionsOpen?: boolean;
	defaultInspectorOpen?: boolean;
	showSizeBreakdown?: boolean;
	dropzoneHeading?: string;
	dropzoneSubtext?: string;
	accept?: string;
	hideSampleButton?: boolean;
}

export function CleanerWorkspace({
	externalState,
	hideDropzone = false,
	hideScopeBanner = false,
	defaultOptions,
	defaultOptionsOpen = false,
	defaultInspectorOpen = false,
	showSizeBreakdown = false,
	dropzoneHeading,
	dropzoneSubtext,
	accept,
	hideSampleButton = false,
}: CleanerWorkspaceProps) {
	const internalState = useCleanerState(defaultOptions);
	const state = externalState ?? internalState;

	const [detailsOpen, setDetailsOpen] = useState(defaultInspectorOpen);
	const [optionsOpen, setOptionsOpen] = useState(defaultOptionsOpen);
	const [isDragging, setIsDragging] = useState(false);
	const [imgError, setImgError] = useState(false);

	const addMoreId = useId();
	const scopeGroupName = useId();
	const aiOnlyRadioId = useId();
	const removeAllRadioId = useId();
	const detailsPanelId = useId();
	const optionsPanelId = useId();

	const headingRef = useRef<HTMLHeadingElement>(null);
	const prevCountRef = useRef(state.items.length);

	// Move keyboard focus cleanly into the active result card when transitioning 0 -> N without scrolling
	useEffect(() => {
		const prev = prevCountRef.current;
		prevCountRef.current = state.items.length;
		if (prev === 0 && state.items.length > 0) {
			requestAnimationFrame(() => {
				headingRef.current?.focus({ preventScroll: true });
			});
		}
	}, [state.items.length]);

	const item = state.selectedItem;
	const previewSrc = toSafeBlobUrl(item?.cleanedUrl ?? item?.previewUrl);

	useEffect(() => {
		if (previewSrc) {
			setImgError(false);
		}
	}, [previewSrc]);

	const impact = useMemo(
		() => (item?.originalMeta ? analyzeCreatorImpact(item.originalMeta) : null),
		[item?.originalMeta],
	);

	function handleAddMoreChange(e: React.ChangeEvent<HTMLInputElement>) {
		const files = e.target.files ? Array.from(e.target.files) : [];
		if (files.length > 0) {
			void state.handleFilesAdded(files);
		}
		e.target.value = "";
	}

	function handleDragOver(e: DragEvent<HTMLElement>) {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
		if (!isDragging) setIsDragging(true);
	}

	function handleDragLeave(e: DragEvent<HTMLElement>) {
		if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
			setIsDragging(false);
		}
	}

	function handleDrop(e: DragEvent<HTMLElement>) {
		e.preventDefault();
		setIsDragging(false);
		const files = filterAcceptedMediaFiles(e.dataTransfer.files);
		if (files.length > 0) {
			void state.handleFilesAdded(files);
		}
	}

	if (state.items.length === 0 || !item) {
		if (hideDropzone) {
			return null;
		}
		return (
			<div className="space-y-4">
				<div className="visually-hidden" aria-live="polite" aria-atomic="true">
					{state.statusMessage}
				</div>
				<UploadDropzone
					onFilesAdded={state.handleFilesAdded}
					onLoadSample={state.handleLoadSample}
					isLoadingSample={state.isLoadingSample}
					heading={dropzoneHeading}
					subtext={dropzoneSubtext}
					accept={accept}
					hideSampleButton={hideSampleButton}
				/>
				{!hideScopeBanner && (
					<aside
						aria-label="What gets removed"
						className="rounded-2xl border border-(--border-color) bg-(--bg-surface) px-5 py-4 text-xs leading-relaxed text-(--text-secondary)"
					>
						<strong className="text-(--text-primary)">Good to know:</strong>{" "}
						Removes all hidden file data (AI creator labels, saved prompts, GPS
						location, camera info) with zero pixel quality loss. Invisible pixel
						watermarks such as Google SynthID live inside the pixels themselves
						and are not removed by metadata cleaning.
					</aside>
				)}
			</div>
		);
	}

	const originalMeta = item.originalMeta;
	const cleanResult = item.cleanResult;
	const isAiOnly = cleanResult?.stripScope === "ai-only";
	const verifiedStrippableLeft = cleanResult?.verification.strippableCount ?? 0;
	const verifiedAiLeft = cleanResult?.verification.aiFlagCount ?? 0;
	const verifiedOtherLeft = Math.max(
		0,
		verifiedStrippableLeft - verifiedAiLeft,
	);
	const isVerifiedClean =
		Boolean(cleanResult) &&
		(isAiOnly ? verifiedAiLeft === 0 : verifiedStrippableLeft === 0);

	const aiCount = originalMeta?.aiFlagCount ?? 0;
	const totalStrippable = originalMeta?.strippableCount ?? 0;
	const otherInfoCount = Math.max(0, totalStrippable - aiCount);

	const isVideo =
		isVideoFormat(originalMeta?.format) ||
		item.file.type.startsWith("video/") ||
		/\.(mp4|mov|webm|mkv)$/i.test(item.file.name);
	const isAudio =
		isAudioFormat(originalMeta?.format) ||
		item.file.type.startsWith("audio/") ||
		/\.(mp3|wav|flac|ogg|aac|m4a)$/i.test(item.file.name);
	const isPdf =
		isPdfFormat(originalMeta?.format) ||
		item.file.type === "application/pdf" ||
		/\.pdf$/i.test(item.file.name);

	const formatLabel =
		originalMeta?.format && originalMeta.format !== "unknown"
			? originalMeta.format.toUpperCase()
			: isPdf
				? "PDF"
				: isAudio
					? "AUDIO"
					: isVideo
						? "VIDEO"
						: "IMAGE";

	const mediaNoun = isPdf
		? "PDF"
		: isAudio
			? "audio"
			: isVideo
				? "video"
				: "image";
	const mediaInfo = originalMeta?.mediaInfo ?? null;

	const isBatch = state.items.length > 1;
	const uncleanedCount = state.items.filter(
		(it) => it.status !== "cleaned",
	).length;
	const cleanedCount = state.items.filter(
		(it) => it.status === "cleaned" && it.cleanResult,
	).length;

	const optionsChangedSinceClean =
		Boolean(cleanResult) &&
		(cleanResult?.modeUsed !== state.options.mode ||
			(state.options.mode === "lossless" &&
				cleanResult?.stripScope !== state.options.stripScope));

	const signalsForSelectedScope =
		state.options.mode === "lossless" && state.options.stripScope === "ai-only"
			? aiCount
			: totalStrippable;

	const aiDetailsList: string[] = [];
	if (impact?.hasC2pa) aiDetailsList.push("C2PA Content Credentials");
	if (impact?.hasIptcAiTag) aiDetailsList.push("IPTC AI source tag");
	if (impact?.hasSavedPrompt) aiDetailsList.push("Saved generation prompt");
	const aiSubtitle =
		aiDetailsList.length > 0
			? aiDetailsList.join(" · ")
			: "C2PA Content Credentials, IPTC AI tags & saved prompts";

	const otherTitle = isPdf
		? "Document & author info"
		: isAudio
			? "Track tags & cover art"
			: isVideo
				? "Camera, GPS & container tags"
				: "EXIF, GPS & device info";

	const otherSubtitle = impact?.hasGps
		? impact.gpsSummary
			? `GPS location (${impact.gpsSummary}), camera info & timestamps`
			: "GPS location, camera info & timestamps"
		: isPdf
			? "Author, creator software, title & document dates"
			: isAudio
				? "Artist, album, encoder tags & embedded cover art"
				: isVideo
					? "Encoder software, recording dates, track names & GPS"
					: "Camera model, GPS coordinates, timestamps & edit history";

	const deepFormatSummary =
		state.options.outputFormat === "image/jpeg"
			? `JPG (${Math.round(state.options.quality * 100)}%)`
			: state.options.outputFormat === "image/png"
				? "PNG"
				: state.options.outputFormat === "image/webp"
					? `WebP (${Math.round(state.options.quality * 100)}%)`
					: state.options.outputFormat === "video/mp4"
						? `MP4 (${Math.round(state.options.quality * 100)}%)`
						: state.options.outputFormat === "video/webm"
							? `WebM (${Math.round(state.options.quality * 100)}%)`
							: "Match original format";

	const sizeLabel = cleanResult
		? `${formatBytes(cleanResult.originalSize)} → ${formatBytes(cleanResult.cleanedSize)}`
		: formatBytes(item.file.size);

	const statusBadgeText =
		item.status === "scanning"
			? "Scanning…"
			: item.status === "cleaning"
				? "Cleaning…"
				: item.status === "cleaned"
					? "Cleaned"
					: item.status === "error"
						? "Error"
						: totalStrippable > 0
							? "Ready to clean"
							: "Scanned";

	return (
		<div className="space-y-4 text-left">
			{/* Single polite live region for batch status announcements */}
			<div className="visually-hidden" aria-live="polite" aria-atomic="true">
				{state.statusMessage}
			</div>

			{/* In-place Hero Workbench Card */}
			<section
				aria-label="Metadata scan results and cleaner"
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={`relative overflow-hidden rounded-2xl border bg-(--bg-card) shadow-sm transition-colors ${
					isDragging
						? "border-(--brand-color) ring-2 ring-(--brand-color)/25"
						: "border-(--border-color)"
				}`}
			>
				{isDragging && (
					<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-(--bg-card)/88 backdrop-blur-xs">
						<div className="rounded-xl border-2 border-dashed border-(--brand-color) bg-(--bg-card) px-6 py-4 text-center shadow-sm">
							<p className="m-0 text-sm font-semibold text-(--text-primary)">
								Drop files to add to batch
							</p>
							<p className="mt-0.5 mb-0 text-xs text-(--text-secondary)">
								Processed 100% locally in your browser
							</p>
						</div>
					</div>
				)}

				{/* Batch Filmstrip (shown only when 2+ files are loaded) */}
				{isBatch && (
					<BatchQueueStrip
						items={state.items}
						selectedId={item.id}
						cleanedCount={cleanedCount}
						totalSignals={state.stats.metadataEntriesFound}
						isBusy={state.isBusy}
						onSelect={state.setSelectedId}
						onRemove={state.handleRemoveItem}
						onClearAll={state.handleClearAll}
					/>
				)}

				{/* Main Two-Column Workbench Stage */}
				<div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[minmax(0,285px)_1fr] lg:grid-cols-[minmax(0,330px)_1fr]">
					{/* Left: Framed Media Preview Stage */}
					<div className="preview-stage-bg relative flex min-h-60 flex-col overflow-hidden rounded-xl border border-(--border-color) md:min-h-80">
						{/* Floating Top Controls: Status Pill + Reset/Remove Button */}
						<div className="pointer-events-none absolute inset-x-2.5 top-2.5 z-10 flex items-center justify-between gap-2">
							<span
								className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-(--border-color)/80 bg-(--bg-card)/92 px-2.5 py-1 text-[10px] font-semibold tracking-[0.06em] uppercase shadow-xs backdrop-blur-xs ${
									item.status === "cleaned"
										? "text-(--success-color)"
										: item.status === "error"
											? "text-(--danger-color)"
											: "text-(--text-primary)"
								}`}
							>
								{(item.status === "scanning" || item.status === "cleaning") && (
									<Loader2
										className="h-3 w-3 animate-spin text-(--brand-color)"
										aria-hidden="true"
									/>
								)}
								{item.status === "cleaned" && (
									<CheckCircle2 className="h-3 w-3" aria-hidden="true" />
								)}
								{statusBadgeText}
							</span>

							<button
								type="button"
								onClick={() =>
									isBatch
										? state.handleRemoveItem(item.id)
										: state.handleClearAll()
								}
								disabled={state.isBusy}
								aria-label={
									isBatch
										? `Remove ${item.file.name} from batch`
										: "Clear file and upload another"
								}
								className="pointer-events-auto touch-target inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-(--border-color)/80 bg-(--bg-card)/92 text-(--text-primary) shadow-xs backdrop-blur-xs hover:border-(--text-primary) disabled:cursor-not-allowed disabled:opacity-45"
							>
								{isBatch ? (
									<X className="h-3.5 w-3.5" aria-hidden="true" />
								) : (
									<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
								)}
							</button>
						</div>

						{/* Preview Media Content */}
						<div className="flex flex-1 items-center justify-center">
							{isPdf ? (
								<div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
									<FileText
										className="h-10 w-10 text-(--text-secondary)"
										aria-hidden="true"
									/>
									<span className="rounded-lg border border-(--border-color) bg-(--bg-card) px-2.5 py-0.5 font-mono text-xs font-semibold text-(--text-primary)">
										PDF
									</span>
									{originalMeta?.pageCount != null && (
										<span className="text-xs text-(--text-secondary)">
											{originalMeta.pageCount}{" "}
											{originalMeta.pageCount === 1 ? "page" : "pages"}
										</span>
									)}
								</div>
							) : isAudio ? (
								<div className="flex w-full flex-col items-center justify-center gap-3 px-4 pt-12 pb-4 text-center">
									<Music
										className="h-9 w-9 text-(--text-secondary)"
										aria-hidden="true"
									/>
									<span className="rounded-lg border border-(--border-color) bg-(--bg-card) px-2.5 py-0.5 font-mono text-xs font-semibold text-(--text-primary)">
										{formatLabel}
									</span>
									<audio
										src={previewSrc}
										controls
										preload="metadata"
										aria-label={`Audio preview of ${item.file.name}`}
										className="w-full max-w-60"
									>
										<track kind="captions" />
									</audio>
								</div>
							) : isVideo ? (
								<AutoplayVideoPreview
									src={previewSrc}
									fileName={item.file.name}
								/>
							) : imgError ? (
								<div className="flex flex-col items-center justify-center gap-1.5 p-6 text-center">
									<span className="rounded-lg border border-(--border-color) bg-(--bg-card) px-2.5 py-1 font-mono text-xs font-semibold text-(--text-primary)">
										{formatLabel}
									</span>
									<span className="max-w-52 text-xs text-(--text-secondary)">
										Preview unavailable in this browser; local cleaning still
										runs normally.
									</span>
								</div>
							) : (
								<img
									src={previewSrc}
									alt={`Preview of ${item.file.name}`}
									onError={() => setImgError(true)}
									className="max-h-72 w-full object-contain md:max-h-80"
								/>
							)}
						</div>

						{/* File Size Indicator (non-overlapping bar for audio controls, floating pill for images/video/PDF) */}
						{isAudio ? (
							<div className="tabular flex items-center justify-between gap-2 border-t border-(--border-color) bg-(--bg-card)/92 px-3 py-1.5 text-xs text-(--text-secondary)">
								<span className="inline-flex items-center gap-1.5 font-medium text-(--text-primary)">
									<Music className="h-3.5 w-3.5" aria-hidden="true" />
									{formatLabel}
									{mediaInfo?.durationSeconds != null &&
										` · ${formatMediaDuration(mediaInfo.durationSeconds)}`}
								</span>
								<span>{sizeLabel}</span>
							</div>
						) : (
							<div className="tabular pointer-events-none absolute right-2.5 bottom-2.5 z-10 inline-flex items-center gap-1.5 rounded-lg border border-(--border-color)/80 bg-(--bg-card)/92 px-2.5 py-1 text-xs font-medium text-(--text-primary) shadow-xs backdrop-blur-xs">
								{isPdf ? (
									<FileText className="h-3.5 w-3.5" aria-hidden="true" />
								) : isVideo ? (
									<Film className="h-3.5 w-3.5" aria-hidden="true" />
								) : (
									<FileImage className="h-3.5 w-3.5" aria-hidden="true" />
								)}
								<span>{sizeLabel}</span>
							</div>
						)}
					</div>

					{/* Right: Scan Summary, Signals, Mode Choice & Primary CTA */}
					<div className="flex min-w-0 flex-col justify-between gap-4">
						<div className="space-y-4">
							{/* Result Headline + File Subtitle */}
							<div>
								<h2
									ref={headingRef}
									tabIndex={-1}
									className="m-0 flex items-center gap-2 text-2xl leading-tight font-semibold tracking-[-0.025em] text-(--text-primary) focus:outline-none sm:text-[1.65rem]"
								>
									{item.status === "scanning" ? (
										"Scanning file…"
									) : item.status === "error" ? (
										"Could not process file"
									) : isVerifiedClean ? (
										<>
											<CheckCircle2
												className="h-6 w-6 shrink-0 text-(--success-color)"
												aria-hidden="true"
											/>
											<span>Cleaned &amp; verified</span>
										</>
									) : totalStrippable > 0 ? (
										`${totalStrippable} ${totalStrippable === 1 ? "signal" : "signals"} found`
									) : (
										"No hidden signals found"
									)}
								</h2>

								<div className="tabular mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-secondary)">
									<span className="max-w-52 truncate font-medium text-(--text-primary)">
										{item.file.name}
									</span>
									{originalMeta && (
										<>
											<span aria-hidden="true">·</span>
											<span>
												{isPdf
													? `${originalMeta.pageCount ?? "?"} ${originalMeta.pageCount === 1 ? "page" : "pages"}`
													: isAudio
														? mediaInfo?.durationSeconds != null
															? formatMediaDuration(mediaInfo.durationSeconds)
															: "Audio"
														: `${originalMeta.width ?? "?"} × ${originalMeta.height ?? "?"} px`}
											</span>
											<span aria-hidden="true">·</span>
											<span>
												{cleanResult &&
												cleanResult.outputExtension.toUpperCase() !==
													formatLabel
													? `${formatLabel} → ${cleanResult.outputExtension.toUpperCase()}`
													: formatLabel}
											</span>
										</>
									)}
									{impact?.detectedGenerator && (
										<span className="rounded-full border border-(--brand-color)/30 bg-(--brand-color)/10 px-2 py-0.5 text-[11px] font-semibold text-(--brand-color)">
											{impact.detectedGenerator}
										</span>
									)}
								</div>
							</div>

							{/* Divided Signal Breakdown Rows */}
							<div className="divide-y divide-(--border-color) border-y border-(--border-color)">
								{/* Row 1: AI Credentials & Saved Prompts */}
								<div className="flex items-center justify-between gap-3 py-3">
									<div className="flex min-w-0 items-center gap-3">
										<span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--bg-surface) text-(--text-secondary)">
											<Shield className="h-4 w-4" aria-hidden="true" />
										</span>
										<div className="min-w-0">
											<p className="m-0 text-sm font-semibold text-(--text-primary)">
												AI labels &amp; prompts
											</p>
											<p className="m-0 text-xs leading-snug text-(--text-secondary)">
												{aiSubtitle}
											</p>
										</div>
									</div>

									<StatusPill
										tone={
											item.status === "scanning"
												? "neutral"
												: isVerifiedClean
													? aiCount > 0
														? "success"
														: "neutral"
													: aiCount > 0
														? "brand"
														: "neutral"
										}
										label={
											item.status === "scanning"
												? "Checking…"
												: isVerifiedClean
													? aiCount > 0
														? "Removed"
														: "None"
													: aiCount > 0
														? `${aiCount} detected`
														: "Not found"
										}
									/>
								</div>

								{/* Row 2: EXIF, GPS, Camera / Document / Audio Metadata */}
								<div className="flex items-center justify-between gap-3 py-3">
									<div className="flex min-w-0 items-center gap-3">
										<span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--bg-surface) text-(--text-secondary)">
											{isPdf ? (
												<FileText className="h-4 w-4" aria-hidden="true" />
											) : isAudio ? (
												<Music className="h-4 w-4" aria-hidden="true" />
											) : impact?.hasGps ? (
												<MapPin className="h-4 w-4" aria-hidden="true" />
											) : (
												<Camera className="h-4 w-4" aria-hidden="true" />
											)}
										</span>
										<div className="min-w-0">
											<p className="m-0 text-sm font-semibold text-(--text-primary)">
												{otherTitle}
											</p>
											<p className="m-0 text-xs leading-snug text-(--text-secondary)">
												{otherSubtitle}
											</p>
										</div>
									</div>

									<StatusPill
										tone={
											item.status === "scanning"
												? "neutral"
												: cleanResult
													? isAiOnly
														? "neutral"
														: verifiedOtherLeft === 0
															? otherInfoCount > 0
																? "success"
																: "neutral"
															: "warning"
													: otherInfoCount > 0
														? "warning"
														: "neutral"
										}
										label={
											item.status === "scanning"
												? "Checking…"
												: cleanResult
													? isAiOnly
														? verifiedOtherLeft > 0
															? `${verifiedOtherLeft} kept`
															: "None"
														: verifiedOtherLeft === 0
															? otherInfoCount > 0
																? "Removed"
																: "None"
															: `${verifiedOtherLeft} left`
													: otherInfoCount > 0
														? `${otherInfoCount} found`
														: "Not found"
										}
									/>
								</div>
							</div>

							{/* Video/Audio Stream Forensics Strip (only for video/audio) */}
							{mediaInfo && (isVideo || isAudio) && (
								<div className="flex flex-wrap items-center gap-1.5 text-[11px] text-(--text-secondary)">
									{mediaInfo.videoCodec && (
										<span className="rounded-md border border-(--border-color) bg-(--bg-surface) px-2 py-0.5 font-mono text-(--text-primary)">
											{mediaInfo.videoCodecString ??
												mediaInfo.videoCodec.toUpperCase()}
										</span>
									)}
									{mediaInfo.frameRate != null && (
										<span className="tabular rounded-md border border-(--border-color) bg-(--bg-surface) px-2 py-0.5">
											{mediaInfo.frameRate} fps
											{mediaInfo.frameRateIsConstant === true
												? " · CFR"
												: mediaInfo.frameRateIsConstant === false
													? " · VFR"
													: ""}
										</span>
									)}
									{mediaInfo.hasHdr && (
										<span className="rounded-md border border-(--warning-color)/40 bg-(--warning-color)/10 px-2 py-0.5 font-semibold text-(--warning-color)">
											HDR
										</span>
									)}
									{mediaInfo.audioCodec && (
										<span className="rounded-md border border-(--border-color) bg-(--bg-surface) px-2 py-0.5 font-mono text-(--text-primary)">
											{mediaInfo.audioCodec.toUpperCase()}
											{mediaInfo.audioChannels
												? ` · ${mediaInfo.audioChannels}ch`
												: ""}
										</span>
									)}
									<span className="rounded-md border border-(--border-color) bg-(--bg-surface) px-2 py-0.5">
										{cleanResult?.modeUsed === "deep"
											? "Re-encoded"
											: "Lossless stream copy"}
									</span>
								</div>
							)}

							{/* Error Message */}
							{item.error && (
								<div
									role="alert"
									className="flex items-center gap-2 rounded-xl border border-(--danger-color)/30 bg-(--danger-color)/10 px-3.5 py-2.5 text-xs font-medium text-(--danger-color)"
								>
									<AlertTriangle
										className="h-4 w-4 shrink-0"
										aria-hidden="true"
									/>
									<span>{item.error}</span>
								</div>
							)}

							{/* Calm Reassurance Line */}
							<p className="m-0 flex items-start gap-2 text-xs leading-relaxed text-(--text-secondary)">
								<Info
									className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--text-muted)"
									aria-hidden="true"
								/>
								<span>
									{state.options.mode === "deep"
										? `Converts to ${deepFormatSummary} and removes all metadata locally. Your original is untouched.`
										: state.options.stripScope === "ai-only"
											? "Removes only AI tags & prompts. Camera EXIF, color profile & pixels stay untouched."
											: "Also clears EXIF & location. Original pixels & color profile stay untouched."}
								</span>
							</p>

							{/* Choice Cards: Cleaning Scope (Lossless) or Active Conversion Summary (Deep) */}
							{state.options.mode === "lossless" ? (
								<fieldset className="m-0 grid grid-cols-1 gap-2.5 border-0 p-0 sm:grid-cols-2">
									<legend className="visually-hidden">
										Choose what to clean
									</legend>

									<label htmlFor={aiOnlyRadioId} className="choice-card">
										<input
											id={aiOnlyRadioId}
											type="radio"
											name={scopeGroupName}
											value="ai-only"
											checked={state.options.stripScope === "ai-only"}
											onChange={() =>
												state.setOptions({
													...state.options,
													stripScope: "ai-only",
												})
											}
											className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
										/>
										<span className="choice-card-header flex flex-wrap items-center gap-1.5 text-sm font-semibold text-(--text-primary)">
											AI tags only
										</span>
										<span className="col-span-full text-xs leading-snug text-(--text-secondary)">
											C2PA &amp; prompts only. Keeps camera EXIF.
											{item.status === "ready" && aiCount === 0 && (
												<span className="mt-0.5 block text-(--text-muted)">
													No AI tags found here.
												</span>
											)}
										</span>
									</label>

									<label htmlFor={removeAllRadioId} className="choice-card">
										<input
											id={removeAllRadioId}
											type="radio"
											name={scopeGroupName}
											value="all"
											checked={state.options.stripScope === "all"}
											onChange={() =>
												state.setOptions({
													...state.options,
													stripScope: "all",
												})
											}
											className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
										/>
										<span className="choice-card-header flex flex-wrap items-center gap-1.5 text-sm font-semibold text-(--text-primary)">
											<span>All-in-one</span>
											<span className="rounded-full bg-(--brand-color)/12 px-2 py-0.5 text-[10px] font-semibold text-(--brand-color)">
												Recommended
											</span>
										</span>
										<span className="col-span-full text-xs leading-snug text-(--text-secondary)">
											Every hidden layer — AI tags, EXIF &amp; GPS.
										</span>
									</label>
								</fieldset>
							) : (
								<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--brand-color)/35 bg-(--brand-color)/6 px-3.5 py-2.5 text-xs">
									<div>
										<span className="font-semibold text-(--text-primary)">
											Convert / Re-encode: {deepFormatSummary}
										</span>
										<span className="block text-(--text-secondary)">
											Strips all metadata automatically while converting.
										</span>
									</div>
									<button
										type="button"
										onClick={() =>
											state.setOptions({
												...state.options,
												mode: "lossless",
											})
										}
										className="touch-target cursor-pointer rounded-lg border border-(--border-color) bg-(--bg-card) px-2.5 py-1 text-xs font-medium text-(--text-primary) hover:border-(--text-primary)"
									>
										Switch to lossless
									</button>
								</div>
							)}
						</div>

						{/* Primary Full-Width CTA Action Row */}
						<div className="flex flex-wrap items-center gap-2 pt-1">
							{isBatch ? (
								uncleanedCount > 0 ? (
									<>
										<button
											type="button"
											onClick={state.handleCleanAll}
											disabled={state.isBusy}
											className="touch-target inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-(--brand-color) px-5 py-3 text-sm font-semibold text-(--brand-text) shadow-xs hover:bg-(--brand-hover) disabled:cursor-not-allowed disabled:opacity-50"
										>
											{state.isBusy ? (
												<Loader2
													className="h-4 w-4 animate-spin"
													aria-hidden="true"
												/>
											) : (
												<Sparkles className="h-4 w-4" aria-hidden="true" />
											)}
											<span>
												{state.isBusy
													? "Cleaning…"
													: `Clean all · ${uncleanedCount} ${uncleanedCount === 1 ? "file" : "files"}`}
											</span>
										</button>

										{cleanResult ? (
											<button
												type="button"
												onClick={() => state.handleDownloadSingle(item)}
												className="touch-target inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-(--border-color) bg-(--bg-surface) px-4 py-3 text-sm font-semibold text-(--text-primary) hover:border-(--text-primary)"
											>
												<Download className="h-4 w-4" aria-hidden="true" />
												Download this
											</button>
										) : (
											<button
												type="button"
												onClick={() => state.handleCleanSingle(item.id)}
												disabled={state.isBusy}
												className="touch-target inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-(--border-color) bg-(--bg-surface) px-4 py-3 text-sm font-semibold text-(--text-primary) hover:border-(--text-primary) disabled:cursor-not-allowed disabled:opacity-45"
											>
												Clean this
											</button>
										)}
									</>
								) : (
									<>
										<button
											type="button"
											onClick={state.handleDownloadAll}
											disabled={cleanedCount === 0}
											className="touch-target inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-(--brand-color) px-5 py-3 text-sm font-semibold text-(--brand-text) shadow-xs hover:bg-(--brand-hover) disabled:cursor-not-allowed disabled:opacity-50"
										>
											<Download className="h-4 w-4" aria-hidden="true" />
											<span>
												{cleanedCount >= 2
													? `Download ZIP (${cleanedCount} files)`
													: "Download clean copy"}
											</span>
										</button>

										{optionsChangedSinceClean ? (
											<button
												type="button"
												onClick={state.handleCleanAll}
												disabled={state.isBusy}
												className="touch-target inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-(--border-color) bg-(--bg-surface) px-4 py-3 text-sm font-semibold text-(--text-primary) hover:border-(--text-primary)"
											>
												Re-clean all
											</button>
										) : (
											<button
												type="button"
												onClick={() => state.handleDownloadSingle(item)}
												className="touch-target inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-(--border-color) bg-(--bg-surface) px-4 py-3 text-sm font-semibold text-(--text-primary) hover:border-(--text-primary)"
											>
												<Download className="h-4 w-4" aria-hidden="true" />
												This file
											</button>
										)}
									</>
								)
							) : cleanResult && !optionsChangedSinceClean ? (
								<>
									<button
										type="button"
										onClick={() => state.handleDownloadSingle(item)}
										className="touch-target inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-(--brand-color) px-5 py-3 text-sm font-semibold text-(--brand-text) shadow-xs hover:bg-(--brand-hover)"
									>
										<Download className="h-4 w-4" aria-hidden="true" />
										<span>Download clean copy</span>
									</button>

									<button
										type="button"
										onClick={state.handleClearAll}
										className="touch-target inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-(--border-color) bg-(--bg-surface) px-4 py-3 text-sm font-semibold text-(--text-primary) hover:border-(--text-primary)"
									>
										<RotateCcw className="h-4 w-4" aria-hidden="true" />
										Clean another
									</button>
								</>
							) : (
								<button
									type="button"
									onClick={() => state.handleCleanSingle(item.id)}
									disabled={
										item.status === "scanning" || item.status === "cleaning"
									}
									className="touch-target inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-(--brand-color) px-5 py-3 text-sm font-semibold text-(--brand-text) shadow-xs hover:bg-(--brand-hover) disabled:cursor-not-allowed disabled:opacity-50"
								>
									{item.status === "scanning" || item.status === "cleaning" ? (
										<Loader2
											className="h-4 w-4 animate-spin"
											aria-hidden="true"
										/>
									) : (
										<Sparkles className="h-4 w-4" aria-hidden="true" />
									)}
									<span>
										{item.status === "scanning"
											? "Scanning…"
											: item.status === "cleaning"
												? "Cleaning…"
												: optionsChangedSinceClean
													? `Re-clean ${mediaNoun}`
													: state.options.mode === "deep"
														? `Convert & clean ${mediaNoun}`
														: signalsForSelectedScope > 0
															? `Clean ${state.options.stripScope === "ai-only" ? "AI tags" : "all"} · ${signalsForSelectedScope} ${signalsForSelectedScope === 1 ? "signal" : "signals"}`
															: `Clean ${mediaNoun} anyway`}
									</span>
								</button>
							)}
						</div>
					</div>
				</div>

				{/* Compact Integrated Utility Footer */}
				<div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--border-color) bg-(--bg-surface)/45 px-4 py-2.5 sm:px-6">
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => setDetailsOpen((prev) => !prev)}
							aria-expanded={detailsOpen}
							aria-controls={detailsPanelId}
							className="touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-(--text-secondary) hover:bg-(--bg-card) hover:text-(--text-primary)"
						>
							<span>
								{detailsOpen
									? "Hide raw metadata"
									: `View raw metadata (${originalMeta?.entries.length ?? 0})`}
							</span>
							<ChevronDown
								className={`h-3.5 w-3.5 transition-transform ${
									detailsOpen ? "rotate-180" : ""
								}`}
								aria-hidden="true"
							/>
						</button>

						<button
							type="button"
							onClick={() => setOptionsOpen((prev) => !prev)}
							aria-expanded={optionsOpen}
							aria-controls={optionsPanelId}
							className="touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-(--text-secondary) hover:bg-(--bg-card) hover:text-(--text-primary)"
						>
							<SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
							<span>Advanced options</span>
							<ChevronDown
								className={`h-3.5 w-3.5 transition-transform ${
									optionsOpen ? "rotate-180" : ""
								}`}
								aria-hidden="true"
							/>
						</button>
					</div>

					<div className="relative inline-flex">
						<input
							id={addMoreId}
							type="file"
							accept={accept ?? ACCEPTED_MEDIA_ACCEPT}
							multiple
							onChange={handleAddMoreChange}
							className="visually-hidden"
						/>
						<label
							htmlFor={addMoreId}
							className="touch-target inline-flex cursor-pointer items-center gap-1 rounded-lg border border-(--border-color) bg-(--bg-card) px-2.5 py-1 text-xs font-medium text-(--text-primary) hover:border-(--text-primary)"
						>
							<Plus className="h-3.5 w-3.5" aria-hidden="true" />
							Add more files
						</label>
					</div>
				</div>

				{/* Expandable Advanced Options Drawer */}
				{optionsOpen && (
					<div
						id={optionsPanelId}
						className="border-t border-(--border-color) bg-(--bg-card) px-4 py-4 sm:px-6"
					>
						<AdvancedOptionsPanel
							options={state.options}
							suffix={state.suffix}
							onOptionsChange={state.setOptions}
							onSuffixChange={state.setSuffix}
						/>
					</div>
				)}

				{/* Expandable Raw Metadata Details Drawer */}
				{detailsOpen && (
					<div
						id={detailsPanelId}
						className="border-t border-(--border-color) bg-(--bg-card) px-4 py-4 sm:px-6"
					>
						<RawMetadataPanel
							item={item}
							showSizeBreakdown={showSizeBreakdown}
						/>
					</div>
				)}
			</section>

			{!hideScopeBanner && (
				<aside
					aria-label="What gets removed"
					className="rounded-2xl border border-(--border-color) bg-(--bg-surface) px-5 py-4 text-xs leading-relaxed text-(--text-secondary)"
				>
					<strong className="text-(--text-primary)">Good to know:</strong>{" "}
					Removes all hidden file data (AI creator labels, saved prompts, GPS
					location, camera info) with zero pixel quality loss. Invisible pixel
					watermarks such as Google SynthID live inside the pixels themselves
					and are not removed by metadata cleaning.
				</aside>
			)}
		</div>
	);
}

function AutoplayVideoPreview({
	src,
	fileName,
}: {
	src: string | undefined;
	fileName: string;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !src) return;
		const reducedMotion =
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reducedMotion) {
			video.pause();
			setIsPlaying(false);
			return;
		}
		void video.play().catch(() => {
			setIsPlaying(false);
		});
	}, [src]);

	function togglePlayback() {
		const video = videoRef.current;
		if (!video) return;
		if (video.paused) {
			void video.play().catch(() => {});
		} else {
			video.pause();
		}
	}

	return (
		<>
			<video
				ref={videoRef}
				src={src}
				muted
				loop
				playsInline
				preload="auto"
				onPlay={() => setIsPlaying(true)}
				onPause={() => setIsPlaying(false)}
				onClick={togglePlayback}
				aria-label={`Preview of ${fileName}`}
				className="block max-h-72 w-full cursor-pointer object-contain md:max-h-80"
			/>
			<button
				type="button"
				onClick={togglePlayback}
				aria-label={isPlaying ? "Pause video preview" : "Play video preview"}
				className="touch-target absolute bottom-2.5 left-2.5 z-10 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-(--border-color)/80 bg-(--bg-card)/92 text-(--text-primary) shadow-xs backdrop-blur-xs hover:border-(--text-primary)"
			>
				{isPlaying ? (
					<Pause className="h-3.5 w-3.5" aria-hidden="true" />
				) : (
					<Play className="h-3.5 w-3.5 translate-x-px" aria-hidden="true" />
				)}
			</button>
		</>
	);
}

function StatusPill({
	tone,
	label,
}: {
	tone: "brand" | "warning" | "success" | "neutral";
	label: string;
}) {
	const styles =
		tone === "brand"
			? "bg-(--brand-color)/12 text-(--brand-color)"
			: tone === "warning"
				? "bg-(--warning-color)/12 text-(--warning-color)"
				: tone === "success"
					? "bg-(--success-color)/12 text-(--success-color)"
					: "bg-(--bg-surface) text-(--text-secondary)";

	const dot =
		tone === "brand"
			? "bg-(--brand-color)"
			: tone === "warning"
				? "bg-(--warning-color)"
				: tone === "success"
					? "bg-(--success-color)"
					: "bg-(--text-muted)";

	return (
		<span
			className={`tabular inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}
		>
			<span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
			{label}
		</span>
	);
}
