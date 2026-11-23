import {
	CheckCircle2,
	Download,
	FileText,
	Film,
	Loader2,
	Music,
	X,
} from "lucide-react";
import { useState } from "react";
import { formatBytes } from "#/lib/format";
import { isAudioFormat, isPdfFormat, isVideoFormat } from "#/lib/metadata";
import type { ImageQueueItem } from "./types";

interface FileQueueCardProps {
	item: ImageQueueItem;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onRemove: (id: string) => void;
	onDownload: (item: ImageQueueItem) => void;
}

export function FileQueueCard({
	item,
	isSelected,
	onSelect,
	onRemove,
	onDownload,
}: FileQueueCardProps) {
	const [imgError, setImgError] = useState(false);
	const metaCount = item.originalMeta?.strippableCount ?? 0;
	const isVideo =
		isVideoFormat(item.originalMeta?.format) ||
		item.file.type.startsWith("video/") ||
		/\.(mp4|mov|webm|mkv)$/i.test(item.file.name);
	const isAudio =
		isAudioFormat(item.originalMeta?.format) ||
		item.file.type.startsWith("audio/") ||
		/\.(mp3|wav|flac|ogg|aac|m4a)$/i.test(item.file.name);
	const isPdf =
		isPdfFormat(item.originalMeta?.format) ||
		item.file.type === "application/pdf" ||
		/\.pdf$/i.test(item.file.name);
	const formatBadge =
		item.originalMeta?.format && item.originalMeta.format !== "unknown"
			? item.originalMeta.format.toUpperCase()
			: isPdf
				? "PDF"
				: isAudio
					? "AUD"
					: isVideo
						? "VID"
						: "IMG";

	return (
		<div
			className={`group relative flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
				isSelected
					? "border-(--brand-color) bg-(--bg-surface)"
					: "border-(--border-color) bg-(--bg-card) hover:border-(--text-muted)"
			}`}
		>
			<button
				type="button"
				onClick={() => onSelect(item.id)}
				aria-current={isSelected ? "true" : undefined}
				className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left"
			>
				{isPdf ? (
					<div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-surface) text-(--text-secondary)">
						<FileText className="h-4 w-4" aria-hidden="true" />
						<span className="font-mono text-[9px] font-semibold">PDF</span>
					</div>
				) : isAudio ? (
					<div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-surface) text-(--text-secondary)">
						<Music className="h-4 w-4" aria-hidden="true" />
						<span className="font-mono text-[9px] font-semibold">
							{formatBadge}
						</span>
					</div>
				) : isVideo ? (
					item.thumbnailUrl ? (
						<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-(--border-color) bg-black">
							<img
								src={item.thumbnailUrl}
								alt={item.file.name}
								className="h-full w-full object-cover"
							/>
							<span className="absolute right-0.5 bottom-0.5 rounded bg-black/75 px-1 py-0 font-mono text-[8px] font-semibold text-white">
								{formatBadge}
							</span>
						</div>
					) : (
						<div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-surface) text-(--text-secondary)">
							<Film className="h-4 w-4" aria-hidden="true" />
							<span className="font-mono text-[9px] font-semibold">
								{formatBadge}
							</span>
						</div>
					)
				) : imgError ? (
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-surface) font-mono text-[10px] font-semibold text-(--text-secondary)">
						{formatBadge}
					</div>
				) : (
					<img
						src={item.previewUrl}
						alt={item.file.name}
						onError={() => setImgError(true)}
						className="h-12 w-12 shrink-0 rounded-lg border border-(--border-color) bg-(--bg-surface) object-cover"
					/>
				)}

				<div className="min-w-0 flex-1 space-y-0.5">
					<div className="truncate text-sm font-medium text-(--text-primary)">
						{item.file.name}
					</div>

					<div className="tabular text-xs whitespace-nowrap text-(--text-muted)">
						{item.cleanResult ? (
							<>
								{formatBytes(item.cleanResult.originalSize)} →{" "}
								<strong className="font-semibold text-(--text-primary)">
									{formatBytes(item.cleanResult.cleanedSize)}
								</strong>
							</>
						) : (
							formatBytes(item.file.size)
						)}
					</div>

					<div className="text-xs font-medium">
						{item.status === "scanning" && (
							<span className="inline-flex items-center gap-1 text-(--text-muted)">
								<Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
								Checking file…
							</span>
						)}
						{item.status === "cleaning" && (
							<span className="inline-flex items-center gap-1 text-(--brand-color)">
								<Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
								Cleaning…
							</span>
						)}
						{item.status === "ready" && (
							<span className="text-(--brand-color)">
								{metaCount > 0
									? `${metaCount} hidden ${metaCount === 1 ? "item" : "items"} found`
									: "No hidden items found"}
							</span>
						)}
						{item.status === "cleaned" && (
							<span className="inline-flex items-center gap-1 text-(--success-color)">
								<CheckCircle2 className="h-3 w-3" aria-hidden="true" />
								{item.cleanResult?.stripScope === "ai-only"
									? "AI Tags Cleaned"
									: "Clean & Ready"}
							</span>
						)}
						{item.status === "error" && (
							<span className="text-(--danger-color)">Error</span>
						)}
					</div>
				</div>
			</button>

			<div className="flex shrink-0 items-center gap-1">
				{item.status === "cleaned" && (
					<button
						type="button"
						onClick={() => onDownload(item)}
						aria-label={`Download cleaned ${item.file.name}`}
						className="touch-target inline-flex cursor-pointer items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-card) p-1.5 text-(--text-primary) hover:border-(--text-primary)"
					>
						<Download className="h-4 w-4" aria-hidden="true" />
					</button>
				)}
				<button
					type="button"
					onClick={() => onRemove(item.id)}
					aria-label={`Remove ${item.file.name}`}
					className="touch-target inline-flex cursor-pointer items-center justify-center rounded-lg border border-transparent p-1.5 text-(--text-muted) hover:text-(--danger-color)"
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
