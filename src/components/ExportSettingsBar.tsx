import { type CSSProperties, useId } from "react";
import type { CleanMode, CleanOptions, OutputFormat } from "#/lib/metadata";

interface AdvancedOptionsPanelProps {
	options: CleanOptions;
	suffix: string;
	onOptionsChange: (next: CleanOptions) => void;
	onSuffixChange: (suffix: string) => void;
}

export function AdvancedOptionsPanel({
	options,
	suffix,
	onOptionsChange,
	onSuffixChange,
}: AdvancedOptionsPanelProps) {
	const preserveIccId = useId();
	const formatId = useId();
	const qualityId = useId();
	const suffixId = useId();

	const qualityPercent = Math.round(options.quality * 100);
	const rangeProgress = ((qualityPercent - 60) / 40) * 100;

	function setMode(mode: CleanMode) {
		onOptionsChange({ ...options, mode });
	}

	return (
		<div className="space-y-4">
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
								<option value="image/png">PNG (Image)</option>
								<option value="image/jpeg">JPEG (Image)</option>
								<option value="image/webp">WebP (Image)</option>
								<option value="video/mp4">MP4 (Video)</option>
								<option value="video/webm">WebM (Video)</option>
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
	);
}
