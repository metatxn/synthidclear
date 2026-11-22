import {
	ChevronDown,
	Download,
	SlidersHorizontal,
	Sparkles,
	Trash2,
} from "lucide-react";
import { type CSSProperties, useId, useState } from "react";
import type {
	CleanMode,
	CleanOptions,
	OutputFormat,
	StripScope,
} from "#/lib/metadata";

interface ExportSettingsBarProps {
	options: CleanOptions;
	suffix: string;
	onOptionsChange: (next: CleanOptions) => void;
	onSuffixChange: (suffix: string) => void;
	onCleanAll: () => void;
	onDownloadAll: () => void;
	onClearAll: () => void;
	totalCount: number;
	cleanedCount: number;
	isBusy: boolean;
	defaultOptionsOpen?: boolean;
}

export function ExportSettingsBar({
	options,
	suffix,
	onOptionsChange,
	onSuffixChange,
	onCleanAll,
	onDownloadAll,
	onClearAll,
	totalCount,
	cleanedCount,
	isBusy,
	defaultOptionsOpen = false,
}: ExportSettingsBarProps) {
	const [optionsOpen, setOptionsOpen] = useState(defaultOptionsOpen);
	const optionsPanelId = useId();
	const preserveIccId = useId();
	const formatId = useId();
	const qualityId = useId();
	const suffixId = useId();

	const qualityPercent = Math.round(options.quality * 100);
	const rangeProgress = ((qualityPercent - 60) / 40) * 100;

	function setMode(mode: CleanMode) {
		onOptionsChange({ ...options, mode });
	}

	function setStripScope(stripScope: StripScope) {
		onOptionsChange({ ...options, stripScope });
	}

	const outputLabel =
		options.outputFormat === "image/jpeg"
			? `Convert to JPG (${qualityPercent}%) · Clean metadata`
			: options.outputFormat === "image/png"
				? "Convert to PNG · Clean metadata"
				: options.outputFormat === "image/webp"
					? `Convert to WebP (${qualityPercent}%) · Clean metadata`
					: "Re-encoding output · Clean metadata";

	const statusText =
		options.mode === "deep"
			? outputLabel
			: options.stripScope === "ai-only"
				? "AI tags only · Original quality"
				: "Keeping original quality";

	const downloadLabel =
		cleanedCount >= 2
			? `Download ZIP (${cleanedCount})`
			: `Download (${cleanedCount})`;

	return (
		<section
			aria-label="Cleaning actions and options"
			className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-3.5 sm:p-4"
		>
			{/* Primary Calm Action Bar */}
			<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
				<div className="flex flex-wrap items-center gap-3">
					<span className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text-primary)">
						<span className="h-2 w-2 rounded-full bg-(--success-color)" />
						{statusText}
					</span>

					<button
						type="button"
						onClick={() => setOptionsOpen((prev) => !prev)}
						aria-expanded={optionsOpen}
						aria-controls={optionsPanelId}
						className="touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--border-color) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-secondary) hover:border-(--text-primary) hover:text-(--text-primary)"
					>
						<SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
						<span>Options</span>
						<ChevronDown
							className={`h-3.5 w-3.5 transition-transform ${
								optionsOpen ? "rotate-180" : ""
							}`}
							aria-hidden="true"
						/>
					</button>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={onCleanAll}
						disabled={totalCount === 0 || isBusy}
						className="touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-(--brand-color) px-4 py-2 text-sm font-semibold text-(--brand-text) hover:bg-(--brand-hover) disabled:cursor-not-allowed disabled:opacity-45"
					>
						<Sparkles className="h-4 w-4" aria-hidden="true" />
						{isBusy ? "Cleaning…" : `Clean All (${totalCount})`}
					</button>

					<button
						type="button"
						onClick={onDownloadAll}
						disabled={cleanedCount === 0}
						className="touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-(--border-color) bg-(--bg-surface) px-4 py-2 text-sm font-semibold text-(--text-primary) hover:border-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Download className="h-4 w-4" aria-hidden="true" />
						{downloadLabel}
					</button>

					<button
						type="button"
						onClick={onClearAll}
						disabled={totalCount === 0 || isBusy}
						className="touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-(--text-secondary) hover:text-(--danger-color) disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Trash2 className="h-4 w-4" aria-hidden="true" />
						Clear
					</button>
				</div>
			</div>

			{/* Collapsible Advanced Options Panel */}
			{optionsOpen && (
				<div
					id={optionsPanelId}
					className="mt-4 space-y-4 border-t border-(--border-color) pt-4"
				>
					<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
						<fieldset className="m-0 flex flex-wrap items-center gap-3 border-0 p-0">
							<legend className="visually-hidden">Cleaning mode</legend>
							<span className="text-xs font-medium text-(--text-secondary)">
								Cleaning mode:
							</span>
							<div className="inline-flex rounded-xl border border-(--border-color) bg-(--bg-surface) p-1">
								<button
									type="button"
									onClick={() => setMode("lossless")}
									aria-pressed={options.mode === "lossless"}
									className={`touch-target cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold ${
										options.mode === "lossless"
											? "bg-(--bg-card) text-(--text-primary) shadow-xs"
											: "text-(--text-secondary) hover:text-(--text-primary)"
									}`}
								>
									Keep Original Quality (Recommended)
								</button>
								<button
									type="button"
									onClick={() => setMode("deep")}
									aria-pressed={options.mode === "deep"}
									className={`touch-target cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold ${
										options.mode === "deep"
											? "bg-(--bg-card) text-(--text-primary) shadow-xs"
											: "text-(--text-secondary) hover:text-(--text-primary)"
									}`}
								>
									Convert / Re-encode
								</button>
							</div>
						</fieldset>

						{options.mode === "lossless" && (
							<fieldset className="m-0 flex flex-wrap items-center gap-3 border-0 p-0">
								<legend className="visually-hidden">What to remove</legend>
								<span className="text-xs font-medium text-(--text-secondary)">
									What to remove:
								</span>
								<div className="inline-flex rounded-xl border border-(--border-color) bg-(--bg-surface) p-1">
									<button
										type="button"
										onClick={() => setStripScope("all")}
										aria-pressed={options.stripScope === "all"}
										className={`touch-target cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold ${
											options.stripScope === "all"
												? "bg-(--bg-card) text-(--text-primary) shadow-xs"
												: "text-(--text-secondary) hover:text-(--text-primary)"
										}`}
									>
										All hidden data (Recommended)
									</button>
									<button
										type="button"
										onClick={() => setStripScope("ai-only")}
										aria-pressed={options.stripScope === "ai-only"}
										className={`touch-target cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold ${
											options.stripScope === "ai-only"
												? "bg-(--bg-card) text-(--text-primary) shadow-xs"
												: "text-(--text-secondary) hover:text-(--text-primary)"
										}`}
									>
										AI tags &amp; prompts only
									</button>
								</div>
							</fieldset>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
						{options.mode === "lossless" ? (
							<label
								htmlFor={preserveIccId}
								className="branded-checkbox-label text-xs font-medium text-(--text-primary)"
							>
								<input
									id={preserveIccId}
									type="checkbox"
									checked={options.preserveIcc}
									onChange={(e) =>
										onOptionsChange({
											...options,
											preserveIcc: e.target.checked,
										})
									}
									className="h-4 w-4 rounded"
								/>
								<span>Keep color profile (prevents washed-out colors)</span>
							</label>
						) : (
							<>
								<div className="flex items-center gap-2">
									<label
										htmlFor={formatId}
										className="text-xs font-medium text-(--text-secondary)"
									>
										Output format
									</label>
									<select
										id={formatId}
										value={options.outputFormat}
										onChange={(e) =>
											onOptionsChange({
												...options,
												outputFormat: e.target.value as OutputFormat,
											})
										}
										className="rounded-lg border border-(--border-color) bg-(--bg-surface) px-2.5 py-1.5 text-xs font-medium text-(--text-primary)"
									>
										<option value="original">Match Original</option>
										<option value="image/png">PNG</option>
										<option value="image/jpeg">JPEG</option>
										<option value="image/webp">WebP</option>
									</select>
								</div>

								<div className="flex items-center gap-3">
									<label
										htmlFor={qualityId}
										className="text-xs font-medium text-(--text-secondary)"
									>
										Quality:{" "}
										<span className="tabular font-semibold text-(--text-primary)">
											{qualityPercent}%
										</span>
									</label>
									<input
										id={qualityId}
										type="range"
										min={60}
										max={100}
										step={1}
										value={qualityPercent}
										onChange={(e) =>
											onOptionsChange({
												...options,
												quality: Number(e.target.value) / 100,
											})
										}
										style={
											{
												"--range-progress": `${rangeProgress}%`,
											} as CSSProperties
										}
										className="branded-range w-28 cursor-pointer sm:w-36"
									/>
								</div>
							</>
						)}

						<div className="flex items-center gap-2 sm:ml-auto">
							<label
								htmlFor={suffixId}
								className="text-xs font-medium text-(--text-secondary)"
							>
								Filename suffix
							</label>
							<input
								id={suffixId}
								type="text"
								value={suffix}
								onChange={(e) => onSuffixChange(e.target.value)}
								placeholder="_clean"
								className="w-24 rounded-lg border border-(--border-color) bg-(--bg-surface) px-2.5 py-1 text-xs font-medium text-(--text-primary)"
							/>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
