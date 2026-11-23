import { Search } from "lucide-react";
import { type KeyboardEvent, useId, useMemo, useRef, useState } from "react";
import { formatBytes } from "#/lib/format";
import {
	categoryLabel,
	type MetadataCategory,
	type MetadataEntry,
} from "#/lib/metadata";
import type { ImageQueueItem } from "./types";

interface RawMetadataPanelProps {
	item: ImageQueueItem;
	showSizeBreakdown?: boolean;
}

type InspectorTab = "original" | "verified";

export function RawMetadataPanel({
	item,
	showSizeBreakdown = false,
}: RawMetadataPanelProps) {
	const [activeTab, setActiveTab] = useState<InspectorTab>("original");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<
		MetadataCategory | "all"
	>("all");

	const searchId = useId();
	const origTabId = useId();
	const verifTabId = useId();
	const origPanelId = useId();
	const verifPanelId = useId();
	const origTabRef = useRef<HTMLButtonElement>(null);
	const verifTabRef = useRef<HTMLButtonElement>(null);

	const originalMeta = item.originalMeta;
	const cleanResult = item.cleanResult;
	const isAiOnly = cleanResult?.stripScope === "ai-only";
	const verifiedStrippableLeft = cleanResult?.verification.strippableCount ?? 0;
	const verifiedAiLeft = cleanResult?.verification.aiFlagCount ?? 0;
	const isVerifiedClean =
		Boolean(cleanResult) &&
		(isAiOnly ? verifiedAiLeft === 0 : verifiedStrippableLeft === 0);

	const activeEntries: MetadataEntry[] = useMemo(() => {
		if (activeTab === "original") {
			return originalMeta?.entries ?? [];
		}
		return cleanResult?.verification.entries ?? [];
	}, [originalMeta, cleanResult, activeTab]);

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

	const sizeBreakdown = useMemo(() => {
		if (!showSizeBreakdown || !originalMeta) return null;

		const seenXmpBlocks = new Set<string>();
		const byCategory = new Map<
			MetadataCategory,
			{ count: number; bytes: number }
		>();
		let totalBytes = 0;

		for (const entry of originalMeta.entries) {
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

		const clampedTotal = Math.min(totalBytes, originalMeta.byteLength);
		const percent =
			originalMeta.byteLength > 0
				? (clampedTotal / originalMeta.byteLength) * 100
				: 0;

		return {
			totalBytes: clampedTotal,
			percent,
			categories: Array.from(byCategory.entries()).sort(
				(a, b) => b[1].bytes - a[1].bytes,
			),
		};
	}, [originalMeta, showSizeBreakdown]);

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

	return (
		<div className="space-y-3">
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

			<div className="flex flex-col justify-between gap-3 border-b border-(--border-color) pb-2.5 sm:flex-row sm:items-center">
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
				aria-labelledby={activeTab === "original" ? origTabId : verifTabId}
				className="custom-scroll max-h-80 overflow-y-auto rounded-xl border border-(--border-color) bg-(--bg-canvas)/50"
			>
				{activeTab === "verified" && !cleanResult ? (
					<div className="p-6 text-center text-xs text-(--text-secondary)">
						Clean the file first to verify the output metadata.
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
