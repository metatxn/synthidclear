import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	Download,
	FileText,
	Music,
	Search,
	Sparkles,
} from "lucide-react";
import {
	type KeyboardEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { formatBytes } from "#/lib/format";
import {
	analyzeCreatorImpact,
	categoryLabel,
	isAudioFormat,
	isPdfFormat,
	isVideoFormat,
	type MetadataCategory,
	type MetadataEntry,
} from "#/lib/metadata";
import { toSafeBlobUrl } from "#/lib/safeUrl";
import type { ImageQueueItem } from "./types";

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

interface MetadataInspectorProps {
	item: ImageQueueItem | null;
	onCleanSingle: (id: string) => void;
	onDownloadSingle: (item: ImageQueueItem) => void;
	defaultDetailsOpen?: boolean;
	showSizeBreakdown?: boolean;
}

type InspectorTab = "original" | "verified";

export function MetadataInspector({
	item,
	onCleanSingle,
	onDownloadSingle,
	defaultDetailsOpen = false,
	showSizeBreakdown = false,
}: MetadataInspectorProps) {
	const [detailsOpen, setDetailsOpen] = useState(defaultDetailsOpen);
	const [imgError, setImgError] = useState(false);
	const [activeTab, setActiveTab] = useState<InspectorTab>("original");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<
		MetadataCategory | "all"
	>("all");

	const detailsId = useId();
	const searchId = useId();
	const origTabId = useId();
	const verifTabId = useId();
	const origPanelId = useId();
	const verifPanelId = useId();
	const origTabRef = useRef<HTMLButtonElement>(null);
	const verifTabRef = useRef<HTMLButtonElement>(null);

	const previewSrc = toSafeBlobUrl(item?.cleanedUrl ?? item?.previewUrl);
	useEffect(() => {
		if (previewSrc) {
			setImgError(false);
		}
	}, [previewSrc]);

	const activeEntries: MetadataEntry[] = useMemo(() => {
		if (!item) return [];
		if (activeTab === "original") {
			return item.originalMeta?.entries ?? [];
		}
		return item.cleanResult?.verification.entries ?? [];
	}, [item, activeTab]);

	const availableCategories = useMemo(() => {
		const cats = new Set<MetadataCategory>();
		for (const entry of activeEntries) {
			cats.add(entry.category);
		}
		return Array.from(cats);
	}, [activeEntries]);

	const filteredEntries = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return activeEntries.filter((entry) => {
			if (selectedCategory !== "all" && entry.category !== selectedCategory) {
				return false;
			}
			if (!q) return true;
			return (
				entry.key.toLowerCase().includes(q) ||
				entry.value.toLowerCase().includes(q) ||
				entry.source.toLowerCase().includes(q) ||
				categoryLabel(entry.category).toLowerCase().includes(q)
			);
		});
	}, [activeEntries, searchQuery, selectedCategory]);

	const impact = useMemo(
		() => (item?.originalMeta ? analyzeCreatorImpact(item.originalMeta) : null),
		[item?.originalMeta],
	);

	const sizeBreakdown = useMemo(() => {
		const meta = item?.originalMeta;
		if (!showSizeBreakdown || !meta) return null;

		const seenXmpBlocks = new Set<string>();
		const byCategory = new Map<
			MetadataCategory,
			{ count: number; bytes: number }
		>();
		let totalBytes = 0;

		for (const entry of meta.entries) {
			const bucket = byCategory.get(entry.category) ?? { count: 0, bytes: 0 };
			bucket.count += 1;

			// XMP entries parsed from the same packet share the full packet byteSize;
			// count each XMP packet's byteSize once to avoid over-reporting.
			const isSharedXmp = entry.id.includes("-xmp-");
			const xmpKey = `${entry.source}:${entry.byteSize}`;
			if (!isSharedXmp || !seenXmpBlocks.has(xmpKey)) {
				if (isSharedXmp) seenXmpBlocks.add(xmpKey);
				bucket.bytes += entry.byteSize;
				totalBytes += entry.byteSize;
			}
			byCategory.set(entry.category, bucket);
		}

		const clampedTotal = Math.min(totalBytes, meta.byteLength);
		const percent =
			meta.byteLength > 0 ? (clampedTotal / meta.byteLength) * 100 : 0;

		return {
			totalBytes: clampedTotal,
			percent,
			categories: Array.from(byCategory.entries()).sort(
				(a, b) => b[1].bytes - a[1].bytes,
			),
		};
	}, [item?.originalMeta, showSizeBreakdown]);

	function handleTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
		if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
			e.preventDefault();
			const next: InspectorTab =
				activeTab === "original" ? "verified" : "original";
			setActiveTab(next);
			setSelectedCategory("all");
			if (next === "original") {
				origTabRef.current?.focus();
			} else {
				verifTabRef.current?.focus();
			}
		} else if (e.key === "Home") {
			e.preventDefault();
			setActiveTab("original");
			setSelectedCategory("all");
			origTabRef.current?.focus();
		} else if (e.key === "End") {
			e.preventDefault();
			setActiveTab("verified");
			setSelectedCategory("all");
			verifTabRef.current?.focus();
		}
	}

	if (!item) {
		return (
			<div className="flex min-h-75 flex-col items-center justify-center rounded-2xl border border-dashed border-(--border-color) bg-(--bg-card) p-8 text-center">
				<p className="m-0 text-sm font-semibold text-(--text-primary)">
					Select a file to view or clean
				</p>
				<p className="mt-1 mb-0 max-w-sm text-xs text-(--text-secondary)">
					Choose a photo or video from your queue — or click Try a Sample Image
					— to see what hidden tags are inside and clean them cleanly.
				</p>
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
	const mediaInfo = originalMeta?.mediaInfo ?? null;

	return (
		<div className="space-y-4 rounded-2xl border border-(--border-color) bg-(--bg-card) p-4 sm:p-5">
			{/* Specimen Preview + Plain-English Action Header */}
			<div className="grid gap-5 md:grid-cols-[180px_1fr]">
				<div className="overflow-hidden rounded-xl border border-(--border-color) bg-(--bg-surface)">
					{isPdf ? (
						<div className="flex h-44 flex-col items-center justify-center gap-1.5 p-4 text-center md:h-full">
							<FileText
								className="h-8 w-8 text-(--text-secondary)"
								aria-hidden="true"
							/>
							<span className="rounded-lg border border-(--border-color) bg-(--bg-card) px-2.5 py-0.5 font-mono text-xs font-semibold text-(--text-primary)">
								PDF
							</span>
							{originalMeta?.pageCount != null && (
								<span className="text-[11px] text-(--text-muted)">
									{originalMeta.pageCount}{" "}
									{originalMeta.pageCount === 1 ? "page" : "pages"}
								</span>
							)}
						</div>
					) : isAudio ? (
						<div className="flex h-44 flex-col items-center justify-center gap-2.5 p-3 text-center md:h-full">
							<Music
								className="h-8 w-8 text-(--text-secondary)"
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
								className="w-full max-w-44"
							>
								<track kind="captions" />
							</audio>
						</div>
					) : isVideo ? (
						<video
							src={previewSrc}
							controls
							muted
							playsInline
							preload="metadata"
							aria-label={`Preview of ${item.file.name}`}
							className="h-44 w-full object-contain md:h-full"
						/>
					) : imgError ? (
						<div className="flex h-44 flex-col items-center justify-center gap-1 p-4 text-center md:h-full">
							<span className="rounded-lg border border-(--border-color) bg-(--bg-card) px-2.5 py-1 font-mono text-xs font-semibold text-(--text-primary)">
								{formatLabel}
							</span>
							<span className="text-[11px] text-(--text-muted)">
								Preview unavailable in this browser; cleaning &amp; conversion
								still run locally.
							</span>
						</div>
					) : (
						<img
							src={previewSrc}
							alt={`Preview of ${item.file.name}`}
							onError={() => setImgError(true)}
							className="h-44 w-full object-contain md:h-full"
						/>
					)}
				</div>

				<div className="flex flex-col justify-between gap-4">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="min-w-0">
							<h3 className="m-0 truncate text-base font-semibold text-(--text-primary)">
								{item.file.name}
							</h3>
							<p className="tabular mt-0.5 mb-0 text-xs text-(--text-secondary)">
								{originalMeta
									? `${
											isPdf
												? `${originalMeta.pageCount ?? "?"} ${
														originalMeta.pageCount === 1 ? "page" : "pages"
													}`
												: isAudio
													? mediaInfo?.durationSeconds != null
														? formatMediaDuration(mediaInfo.durationSeconds)
														: "Audio"
													: `${originalMeta.width ?? "?"} × ${
															originalMeta.height ?? "?"
														} px${
															mediaInfo?.durationSeconds != null
																? ` · ${formatMediaDuration(mediaInfo.durationSeconds)}`
																: ""
														}`
										} · ${
											cleanResult &&
											cleanResult.outputExtension.toUpperCase() !== formatLabel
												? `${formatLabel} → ${cleanResult.outputExtension.toUpperCase()}`
												: formatLabel
										} · ${
											cleanResult
												? `${formatBytes(cleanResult.originalSize)} → ${formatBytes(
														cleanResult.cleanedSize,
													)}`
												: formatBytes(item.file.size)
										}`
									: formatBytes(item.file.size)}
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							{cleanResult ? (
								<>
									<button
										type="button"
										onClick={() => onDownloadSingle(item)}
										className="touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-(--brand-color) px-4 py-2 text-xs font-semibold text-(--brand-text) hover:bg-(--brand-hover)"
									>
										<Download className="h-3.5 w-3.5" aria-hidden="true" />
										Download Clean Copy
									</button>
									<button
										type="button"
										onClick={() => onCleanSingle(item.id)}
										disabled={
											item.status === "cleaning" || item.status === "scanning"
										}
										className="touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-(--border-color) bg-(--bg-surface) px-3 py-2 text-xs font-medium text-(--text-primary) hover:border-(--text-primary) disabled:cursor-not-allowed disabled:opacity-45"
									>
										Re-clean
									</button>
								</>
							) : (
								<button
									type="button"
									onClick={() => onCleanSingle(item.id)}
									disabled={
										item.status === "cleaning" || item.status === "scanning"
									}
									className="touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-(--brand-color) px-4 py-2 text-xs font-semibold text-(--brand-text) hover:bg-(--brand-hover) disabled:cursor-not-allowed disabled:opacity-45"
								>
									<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
									{isPdf
										? "Clean PDF"
										: isAudio
											? "Clean Audio"
											: isVideo
												? "Clean Video"
												: "Clean Image"}
								</button>
							)}
						</div>
					</div>

					{/* 4 Simple Human Status Tiles */}
					<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
						<div className="rounded-xl border border-(--border-color) bg-(--bg-surface) px-3 py-2.5">
							<span className="block text-[11px] font-medium text-(--text-secondary)">
								AI Tags &amp; Prompts
							</span>
							<span
								className={`tabular mt-0.5 block text-sm font-semibold ${
									isVerifiedClean
										? "text-(--success-color)"
										: aiCount > 0
											? "text-(--brand-color)"
											: "text-(--text-primary)"
								}`}
							>
								{isVerifiedClean
									? "All removed"
									: aiCount > 0
										? `${aiCount} found`
										: "None"}
							</span>
						</div>

						<div className="rounded-xl border border-(--border-color) bg-(--bg-surface) px-3 py-2.5">
							<span className="block text-[11px] font-medium text-(--text-secondary)">
								{isPdf
									? "Author & Doc Info"
									: isAudio
										? "Tags & Cover Art"
										: "Camera & GPS"}
							</span>
							<span
								className={`tabular mt-0.5 block text-sm font-semibold ${
									isVerifiedClean && !isAiOnly
										? "text-(--success-color)"
										: otherInfoCount > 0
											? "text-(--warning-color)"
											: "text-(--text-primary)"
								}`}
							>
								{cleanResult
									? isAiOnly
										? verifiedOtherLeft > 0
											? `${verifiedOtherLeft} kept`
											: "None"
										: verifiedOtherLeft === 0
											? "All removed"
											: `${verifiedOtherLeft} left`
									: otherInfoCount > 0
										? `${otherInfoCount} found`
										: "None"}
							</span>
						</div>

						<div className="rounded-xl border border-(--border-color) bg-(--bg-surface) px-3 py-2.5">
							<span className="block text-[11px] font-medium text-(--text-secondary)">
								{isPdf
									? "Document"
									: isAudio
										? "Audio Quality"
										: isVideo
											? "Video Quality"
											: "Image Quality"}
							</span>
							<span className="mt-0.5 block text-sm font-semibold text-(--text-primary)">
								{!isPdf && cleanResult?.modeUsed === "deep"
									? `Converted (${cleanResult.outputExtension.toUpperCase()})`
									: "100% Original"}
							</span>
						</div>

						<div className="rounded-xl border border-(--border-color) bg-(--bg-surface) px-3 py-2.5">
							<span className="block text-[11px] font-medium text-(--text-secondary)">
								{isPdf
									? "Pages"
									: isVideo || isAudio
										? "Streams"
										: "Color Profile"}
							</span>
							<span className="mt-0.5 block text-sm font-semibold text-(--text-primary)">
								{isPdf
									? originalMeta?.pageCount != null
										? `${originalMeta.pageCount} ${
												originalMeta.pageCount === 1 ? "page" : "pages"
											}`
										: "PDF"
									: isVideo || isAudio
										? cleanResult?.modeUsed === "deep"
											? "Re-encoded"
											: "Lossless copy"
										: originalMeta?.hasIccProfile
											? cleanResult
												? cleanResult.iccPreserved
													? "Kept"
													: "Removed"
												: "Will keep"
											: "Standard"}
							</span>
						</div>
					</div>

					{/* Stream & Track Forensics (Mediabunny track inspection for video/audio) */}
					{mediaInfo && (isVideo || isAudio) && (
						<div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-(--border-color) bg-(--bg-surface)/70 px-3 py-2 text-[11px] text-(--text-secondary)">
							<span className="font-semibold text-(--text-primary)">
								Streams:
							</span>
							{mediaInfo.videoCodec && (
								<span className="rounded-md border border-(--border-color) bg-(--bg-card) px-2 py-0.5 font-mono text-(--text-primary)">
									{mediaInfo.videoCodecString ??
										mediaInfo.videoCodec.toUpperCase()}
								</span>
							)}
							{mediaInfo.frameRate != null && (
								<span className="tabular rounded-md border border-(--border-color) bg-(--bg-card) px-2 py-0.5">
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
							{mediaInfo.colorSpace && (
								<span className="rounded-md border border-(--border-color) bg-(--bg-card) px-2 py-0.5 font-mono">
									{mediaInfo.colorSpace}
								</span>
							)}
							{mediaInfo.rotation != null && mediaInfo.rotation !== 0 && (
								<span className="rounded-md border border-(--border-color) bg-(--bg-card) px-2 py-0.5">
									Rotated {mediaInfo.rotation}°
								</span>
							)}
							{mediaInfo.audioCodec && (
								<span className="rounded-md border border-(--border-color) bg-(--bg-card) px-2 py-0.5 font-mono text-(--text-primary)">
									{mediaInfo.audioCodec.toUpperCase()}
									{mediaInfo.audioChannels
										? ` · ${mediaInfo.audioChannels}ch`
										: ""}
									{mediaInfo.audioSampleRate
										? ` · ${(mediaInfo.audioSampleRate / 1000).toFixed(1)} kHz`
										: ""}
								</span>
							)}
							<span className="rounded-md border border-(--border-color) bg-(--bg-card) px-2 py-0.5">
								{mediaInfo.trackCount}{" "}
								{mediaInfo.trackCount === 1 ? "track" : "tracks"}
							</span>
							{mediaInfo.trackNames.length > 0 && (
								<span className="rounded-md border border-(--brand-color)/35 bg-(--brand-color)/8 px-2 py-0.5 text-(--brand-color)">
									Track names: {mediaInfo.trackNames.join(", ")}
								</span>
							)}
						</div>
					)}

					{/* Plain-English Creator Impact Callout (shown before cleaning when risks exist) */}
					{!cleanResult && impact && impact.warnings.length > 0 && (
						<div className="space-y-1.5 rounded-xl border border-(--brand-color)/35 bg-(--brand-color)/8 px-3.5 py-2.5 text-xs">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className="font-semibold text-(--brand-color)">
									What this file reveals right now
								</span>
								{impact.detectedGenerator && (
									<span className="rounded-full bg-(--bg-card) px-2 py-0.5 text-[11px] font-medium text-(--text-primary)">
										Detected: {impact.detectedGenerator}
									</span>
								)}
							</div>
							<ul className="m-0 list-disc space-y-0.5 pl-4 text-(--text-secondary)">
								{impact.warnings.map((warning) => (
									<li key={warning}>{warning}</li>
								))}
							</ul>
						</div>
					)}

					{/* Reassuring Verified Clean Banner or Error */}
					{isVerifiedClean && (
						<div className="flex items-center gap-2.5 rounded-xl border border-(--success-color)/30 bg-(--success-color)/10 px-3.5 py-2.5 text-xs font-medium text-(--success-color)">
							<CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
							<span>
								{isAiOnly
									? "Clean & verified — all AI tags & prompts removed (camera & EXIF info kept)."
									: "Clean & verified — all hidden metadata removed. Ready to download."}
							</span>
						</div>
					)}

					{item.error && (
						<div
							role="alert"
							className="flex items-center gap-2 rounded-xl border border-(--danger-color)/30 bg-(--danger-color)/10 px-3.5 py-2.5 text-xs font-medium text-(--danger-color)"
						>
							<AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
							<span>{item.error}</span>
						</div>
					)}

					{sizeBreakdown && (
						<div className="space-y-2 rounded-xl border border-(--border-color) bg-(--bg-surface) px-3.5 py-2.5 text-xs">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className="font-semibold text-(--text-primary)">
									Metadata footprint
								</span>
								<span className="tabular text-(--text-secondary)">
									{formatBytes(sizeBreakdown.totalBytes)} (
									{sizeBreakdown.percent < 0.1 && sizeBreakdown.totalBytes > 0
										? "<0.1"
										: sizeBreakdown.percent.toFixed(1)}
									% of file)
									{cleanResult &&
										cleanResult.originalSize > cleanResult.cleanedSize &&
										` · ${formatBytes(cleanResult.originalSize - cleanResult.cleanedSize)} removed`}
								</span>
							</div>
							{sizeBreakdown.categories.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{sizeBreakdown.categories.map(([cat, stats]) => (
										<span
											key={cat}
											className="tabular rounded-md border border-(--border-color) bg-(--bg-card) px-2 py-0.5 text-[11px] text-(--text-secondary)"
										>
											{categoryLabel(cat)}: {stats.count}{" "}
											{stats.count === 1 ? "item" : "items"} (
											{formatBytes(stats.bytes)})
										</span>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Progressive Disclosure: Collapsible Raw Metadata Details */}
			<div className="border-t border-(--border-color) pt-3">
				<button
					type="button"
					onClick={() => setDetailsOpen((prev) => !prev)}
					aria-expanded={detailsOpen}
					aria-controls={detailsId}
					className="touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary)"
				>
					<span>
						{detailsOpen
							? "Hide raw metadata details"
							: `View raw metadata details (${originalMeta?.entries.length ?? 0})`}
					</span>
					<ChevronDown
						className={`h-3.5 w-3.5 transition-transform ${
							detailsOpen ? "rotate-180" : ""
						}`}
						aria-hidden="true"
					/>
				</button>

				{detailsOpen && (
					<div id={detailsId} className="mt-3 space-y-3">
						<div className="flex flex-col justify-between gap-3 border-b border-(--border-color) pb-2 sm:flex-row sm:items-center">
							<div
								role="tablist"
								aria-label="Metadata inspection view"
								className="inline-flex rounded-xl border border-(--border-color) bg-(--bg-surface) p-1"
							>
								<button
									ref={origTabRef}
									id={origTabId}
									role="tab"
									type="button"
									aria-selected={activeTab === "original"}
									aria-controls={origPanelId}
									tabIndex={activeTab === "original" ? 0 : -1}
									onClick={() => {
										setActiveTab("original");
										setSelectedCategory("all");
									}}
									onKeyDown={handleTabKeyDown}
									className={`touch-target cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold ${
										activeTab === "original"
											? "bg-(--bg-card) text-(--text-primary) shadow-xs"
											: "text-(--text-secondary) hover:text-(--text-primary)"
									}`}
								>
									Before ({originalMeta?.entries.length ?? 0})
								</button>

								<button
									ref={verifTabRef}
									id={verifTabId}
									role="tab"
									type="button"
									aria-selected={activeTab === "verified"}
									aria-controls={verifPanelId}
									tabIndex={activeTab === "verified" ? 0 : -1}
									onClick={() => {
										setActiveTab("verified");
										setSelectedCategory("all");
									}}
									onKeyDown={handleTabKeyDown}
									className={`touch-target cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold ${
										activeTab === "verified"
											? "bg-(--bg-card) text-(--text-primary) shadow-xs"
											: "text-(--text-secondary) hover:text-(--text-primary)"
									}`}
								>
									After Clean ({cleanResult ? verifiedStrippableLeft : "—"})
								</button>
							</div>

							{activeEntries.length > 0 && (
								<div className="relative sm:w-64">
									<label htmlFor={searchId} className="visually-hidden">
										Filter metadata details
									</label>
									<Search
										className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--text-muted)"
										aria-hidden="true"
									/>
									<input
										id={searchId}
										type="search"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search metadata…"
										className="w-full rounded-lg border border-(--border-color) bg-(--bg-surface) py-1.5 pr-3 pl-8 text-xs text-(--text-primary) placeholder:text-(--text-muted)"
									/>
								</div>
							)}
						</div>

						{availableCategories.length > 1 && (
							<div className="flex flex-wrap items-center gap-1.5">
								<button
									type="button"
									onClick={() => setSelectedCategory("all")}
									aria-pressed={selectedCategory === "all"}
									className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium ${
										selectedCategory === "all"
											? "border-(--text-primary) bg-(--text-primary) text-(--bg-canvas)"
											: "border-(--border-color) bg-(--bg-surface) text-(--text-secondary)"
									}`}
								>
									All ({activeEntries.length})
								</button>
								{availableCategories.map((cat) => {
									const count = activeEntries.filter(
										(e) => e.category === cat,
									).length;
									return (
										<button
											key={cat}
											type="button"
											onClick={() => setSelectedCategory(cat)}
											aria-pressed={selectedCategory === cat}
											className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium ${
												selectedCategory === cat
													? "border-(--text-primary) bg-(--text-primary) text-(--bg-canvas)"
													: "border-(--border-color) bg-(--bg-surface) text-(--text-secondary)"
											}`}
										>
											{categoryLabel(cat)} ({count})
										</button>
									);
								})}
							</div>
						)}

						<div
							id={activeTab === "original" ? origPanelId : verifPanelId}
							role="tabpanel"
							aria-labelledby={
								activeTab === "original" ? origTabId : verifTabId
							}
							className="custom-scroll max-h-80 overflow-y-auto rounded-xl border border-(--border-color) bg-(--bg-canvas)/50"
						>
							{activeTab === "verified" && !cleanResult ? (
								<div className="p-6 text-center text-xs text-(--text-secondary)">
									Click Clean Image to verify the output file.
								</div>
							) : activeTab === "verified" && isVerifiedClean ? (
								<div>
									<div className="border-b border-(--border-color) bg-(--success-color)/10 px-4 py-3 text-xs font-medium text-(--success-color)">
										{isAiOnly
											? "Verified clean — 0 AI tags or prompts remain."
											: "Verified clean — 0 hidden metadata items remain."}
									</div>
									{filteredEntries.length > 0 && (
										<div className="divide-y divide-(--border-color)">
											{filteredEntries.map((entry) => (
												<MetadataDetailRow key={entry.id} entry={entry} />
											))}
										</div>
									)}
								</div>
							) : filteredEntries.length === 0 ? (
								<div className="p-6 text-center text-xs text-(--text-muted)">
									{activeEntries.length === 0
										? "No metadata entries found."
										: "No entries match your search."}
								</div>
							) : (
								<div className="divide-y divide-(--border-color)">
									{filteredEntries.map((entry) => (
										<MetadataDetailRow key={entry.id} entry={entry} />
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function MetadataDetailRow({ entry }: { entry: MetadataEntry }) {
	return (
		<article className="grid gap-1.5 px-4 py-3 text-xs sm:grid-cols-12 sm:gap-3">
			<div className="min-w-0 sm:col-span-4">
				<span
					className={`inline-block text-[11px] font-semibold ${
						entry.isAiFlag
							? "text-(--brand-color)"
							: entry.category === "icc"
								? "text-(--success-color)"
								: "text-(--text-muted)"
					}`}
				>
					{categoryLabel(entry.category)} · {entry.source}
				</span>
				<h4 className="m-0 wrap-break-word font-semibold text-(--text-primary)">
					{entry.key}
				</h4>
			</div>

			<div className="min-w-0 sm:col-span-8">
				<p className="m-0 whitespace-pre-wrap font-mono text-[11px] leading-relaxed wrap-anywhere text-(--text-secondary)">
					{entry.value}
				</p>
			</div>
		</article>
	);
}
