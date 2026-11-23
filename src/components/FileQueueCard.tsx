import {
	CheckCircle2,
	FileText,
	Film,
	Loader2,
	Music,
	Trash2,
	X,
} from "lucide-react";
import { useState } from "react";
import { isAudioFormat, isPdfFormat, isVideoFormat } from "#/lib/metadata";
import { toSafeBlobUrl } from "#/lib/safeUrl";
import type { ImageQueueItem } from "./types";

interface BatchQueueStripProps {
	items: ImageQueueItem[];
	selectedId: string | null;
	cleanedCount: number;
	totalSignals: number;
	isBusy: boolean;
	onSelect: (id: string) => void;
	onRemove: (id: string) => void;
	onClearAll: () => void;
}

export function BatchQueueStrip({
	items,
	selectedId,
	cleanedCount,
	totalSignals,
	isBusy,
	onSelect,
	onRemove,
	onClearAll,
}: BatchQueueStripProps) {
	return (
		<div className="border-b border-(--border-color) bg-(--bg-surface)/60 px-4 py-3 sm:px-5">
			<div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2 text-xs">
					<span className="font-semibold text-(--text-primary)">
						Batch ({items.length} files)
					</span>
					<span className="tabular rounded-full border border-(--border-color) bg-(--bg-card) px-2 py-0.5 text-[11px] font-medium text-(--text-secondary)">
						{cleanedCount > 0
							? `${cleanedCount} of ${items.length} cleaned`
							: `${totalSignals} ${totalSignals === 1 ? "signal" : "signals"} total`}
					</span>
				</div>

				<button
					type="button"
					onClick={onClearAll}
					disabled={isBusy}
					className="touch-target inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-(--text-secondary) hover:text-(--danger-color) disabled:cursor-not-allowed disabled:opacity-45"
				>
					<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
					Clear all
				</button>
			</div>

			<div className="custom-scroll flex gap-2 overflow-x-auto pb-0.5">
				{items.map((item) => (
					<BatchQueueChip
						key={item.id}
						item={item}
						isSelected={selectedId === item.id}
						onSelect={onSelect}
						onRemove={onRemove}
					/>
				))}
			</div>
		</div>
	);
}

function BatchQueueChip({
	item,
	isSelected,
	onSelect,
	onRemove,
}: {
	item: ImageQueueItem;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onRemove: (id: string) => void;
}) {
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

	return (
		<div
			className={`flex shrink-0 items-center gap-2 rounded-xl border p-1.5 pr-1 transition-colors ${
				isSelected
					? "border-(--brand-color) bg-(--bg-card) shadow-xs"
					: "border-(--border-color) bg-(--bg-card)/70 hover:border-(--text-muted)"
			}`}
		>
			<button
				type="button"
				onClick={() => onSelect(item.id)}
				aria-current={isSelected ? "true" : undefined}
				className="flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
			>
				{isPdf ? (
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-surface) text-(--text-secondary)">
						<FileText className="h-4 w-4" aria-hidden="true" />
					</span>
				) : isAudio ? (
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-surface) text-(--text-secondary)">
						<Music className="h-4 w-4" aria-hidden="true" />
					</span>
				) : isVideo ? (
					item.thumbnailUrl ? (
						<img
							src={toSafeBlobUrl(item.thumbnailUrl)}
							alt=""
							className="h-9 w-9 shrink-0 rounded-lg border border-(--border-color) bg-black object-cover"
						/>
					) : (
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-surface) text-(--text-secondary)">
							<Film className="h-4 w-4" aria-hidden="true" />
						</span>
					)
				) : imgError ? (
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-surface) font-mono text-[9px] font-semibold text-(--text-secondary)">
						IMG
					</span>
				) : (
					<img
						src={toSafeBlobUrl(item.previewUrl)}
						alt=""
						onError={() => setImgError(true)}
						className="h-9 w-9 shrink-0 rounded-lg border border-(--border-color) bg-(--bg-surface) object-cover"
					/>
				)}

				<div className="max-w-32 min-w-0">
					<span className="block truncate text-xs font-medium text-(--text-primary)">
						{item.file.name}
					</span>
					<span className="block text-[11px] font-medium">
						{item.status === "scanning" && (
							<span className="inline-flex items-center gap-1 text-(--text-muted)">
								<Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
								Scanning…
							</span>
						)}
						{item.status === "cleaning" && (
							<span className="inline-flex items-center gap-1 text-(--brand-color)">
								<Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
								Cleaning…
							</span>
						)}
						{item.status === "ready" && (
							<span
								className={
									metaCount > 0 ? "text-(--brand-color)" : "text-(--text-muted)"
								}
							>
								{metaCount > 0
									? `${metaCount} ${metaCount === 1 ? "signal" : "signals"}`
									: "Clean"}
							</span>
						)}
						{item.status === "cleaned" && (
							<span className="inline-flex items-center gap-1 text-(--success-color)">
								<CheckCircle2 className="h-3 w-3" aria-hidden="true" />
								Done
							</span>
						)}
						{item.status === "error" && (
							<span className="text-(--danger-color)">Error</span>
						)}
					</span>
				</div>
			</button>

			<button
				type="button"
				onClick={() => onRemove(item.id)}
				aria-label={`Remove ${item.file.name}`}
				className="touch-target inline-flex cursor-pointer items-center justify-center rounded-lg border border-transparent p-1 text-(--text-muted) hover:text-(--danger-color)"
			>
				<X className="h-3.5 w-3.5" aria-hidden="true" />
			</button>
		</div>
	);
}
