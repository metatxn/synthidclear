import { Plus } from "lucide-react";
import { useId } from "react";
import { ACCEPTED_MEDIA_ACCEPT } from "#/lib/format";
import { type CleanerState, useCleanerState } from "#/lib/useCleanerState";
import { ExportSettingsBar } from "./ExportSettingsBar";
import { FileQueueCard } from "./FileQueueCard";
import { MetadataInspector } from "./MetadataInspector";
import { StatsGrid } from "./StatsGrid";
import { UploadDropzone } from "./UploadDropzone";

interface CleanerWorkspaceProps {
	externalState?: CleanerState;
	hideDropzone?: boolean;
	hideScopeBanner?: boolean;
}

export function CleanerWorkspace({
	externalState,
	hideDropzone = false,
	hideScopeBanner = false,
}: CleanerWorkspaceProps) {
	const internalState = useCleanerState();
	const state = externalState ?? internalState;
	const addMoreId = useId();

	function handleAddMoreChange(e: React.ChangeEvent<HTMLInputElement>) {
		const files = e.target.files ? Array.from(e.target.files) : [];
		if (files.length > 0) {
			void state.handleFilesAdded(files);
		}
		e.target.value = "";
	}

	return (
		<div className="space-y-4">
			{/* Single polite live region for batch status announcements */}
			<div className="visually-hidden" aria-live="polite" aria-atomic="true">
				{state.statusMessage}
			</div>

			{!hideDropzone && (
				<UploadDropzone
					onFilesAdded={state.handleFilesAdded}
					onLoadSample={state.handleLoadSample}
					isLoadingSample={state.isLoadingSample}
				/>
			)}

			<ExportSettingsBar
				options={state.options}
				suffix={state.suffix}
				onOptionsChange={state.setOptions}
				onSuffixChange={state.setSuffix}
				onCleanAll={state.handleCleanAll}
				onDownloadAll={state.handleDownloadAll}
				onClearAll={state.handleClearAll}
				totalCount={state.items.length}
				cleanedCount={state.stats.cleanedVerified}
				isBusy={state.isBusy}
			/>

			<StatsGrid
				imagesLoaded={state.stats.imagesLoaded}
				metadataEntriesFound={state.stats.metadataEntriesFound}
				aiFlagsFound={state.stats.aiFlagsFound}
				cleanedVerified={state.stats.cleanedVerified}
			/>

			{/* Queue + Inspector Split Layout */}
			<section
				aria-label="File queue and cleaner details"
				className="grid gap-4 lg:grid-cols-[320px_1fr]"
			>
				<div className="flex flex-col gap-3 rounded-2xl border border-(--border-color) bg-(--bg-card) p-4">
					<div className="flex items-center justify-between gap-2">
						<h2 className="m-0 text-sm font-semibold text-(--text-primary)">
							Queue ({state.items.length})
						</h2>
						{hideDropzone && (
							<div>
								<input
									id={addMoreId}
									type="file"
									accept={ACCEPTED_MEDIA_ACCEPT}
									multiple
									onChange={handleAddMoreChange}
									className="visually-hidden"
								/>
								<label
									htmlFor={addMoreId}
									className="touch-target inline-flex cursor-pointer items-center gap-1 rounded-lg border border-(--border-color) bg-(--bg-surface) px-2.5 py-1 text-xs font-medium text-(--text-primary) hover:border-(--text-primary)"
								>
									<Plus className="h-3.5 w-3.5" aria-hidden="true" />
									Add more
								</label>
							</div>
						)}
					</div>

					{state.items.length === 0 ? (
						<div className="flex min-h-50 flex-col items-center justify-center rounded-xl border border-dashed border-(--border-color) bg-(--bg-surface)/40 p-6 text-center text-xs text-(--text-secondary)">
							No files queued yet. Drop photos or videos above, or try a sample
							image.
						</div>
					) : (
						<div className="custom-scroll flex max-h-125 flex-col gap-2 overflow-y-auto pr-1">
							{state.items.map((item) => (
								<FileQueueCard
									key={item.id}
									item={item}
									isSelected={state.selectedItem?.id === item.id}
									onSelect={state.setSelectedId}
									onRemove={state.handleRemoveItem}
									onDownload={state.handleDownloadSingle}
								/>
							))}
						</div>
					)}
				</div>

				<MetadataInspector
					item={state.selectedItem}
					onCleanSingle={state.handleCleanSingle}
					onDownloadSingle={state.handleDownloadSingle}
				/>
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
