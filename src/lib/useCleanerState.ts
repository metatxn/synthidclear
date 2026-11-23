import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImageQueueItem } from "#/components/types";
import { buildCleanedFilename } from "./format";
import {
	type CleanOptions,
	createSampleAiImageFile,
	isVideoFormat,
} from "./metadata";
import { extractVideoThumbnailUrl } from "./videoThumbnail";
import { cleanerClient, runWithConcurrency } from "./workerClient";
import { createZipBlob } from "./zip";

export const DEFAULT_CLEAN_OPTIONS: CleanOptions = {
	mode: "lossless",
	preserveIcc: true,
	stripScope: "all",
	outputFormat: "original",
	quality: 0.92,
};

export function useCleanerState(initialOptions?: Partial<CleanOptions>) {
	const [items, setItems] = useState<ImageQueueItem[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [options, setOptions] = useState<CleanOptions>(() => ({
		...DEFAULT_CLEAN_OPTIONS,
		...initialOptions,
	}));
	const [suffix, setSuffix] = useState("_clean");
	const [isLoadingSample, setIsLoadingSample] = useState(false);
	const [isBatchCleaning, setIsBatchCleaning] = useState(false);
	const [statusMessage, setStatusMessage] = useState("");

	const itemsRef = useRef<ImageQueueItem[]>([]);
	itemsRef.current = items;

	useEffect(() => {
		return () => {
			for (const item of itemsRef.current) {
				URL.revokeObjectURL(item.previewUrl);
				if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
				if (item.cleanedUrl) URL.revokeObjectURL(item.cleanedUrl);
			}
		};
	}, []);

	const handleFilesAdded = useCallback(async (files: File[]) => {
		const newItems: ImageQueueItem[] = files.map((file) => ({
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			file,
			previewUrl: URL.createObjectURL(file),
			thumbnailUrl: null,
			status: "scanning",
			originalMeta: null,
			cleanResult: null,
			cleanedUrl: null,
			error: null,
		}));

		setItems((prev) => [...newItems, ...prev]);
		if (newItems[0]) {
			setSelectedId(newItems[0].id);
		}

		await runWithConcurrency(newItems, 2, async (entry) => {
			try {
				const parsed = await cleanerClient.inspect(entry.file);
				setItems((prev) =>
					prev.map((it) =>
						it.id === entry.id
							? { ...it, status: "ready", originalMeta: parsed }
							: it,
					),
				);
				if (isVideoFormat(parsed.format)) {
					void extractVideoThumbnailUrl(entry.file, 144).then((thumbUrl) => {
						if (!thumbUrl) return;
						if (!itemsRef.current.some((it) => it.id === entry.id)) {
							URL.revokeObjectURL(thumbUrl);
							return;
						}
						setItems((prev) =>
							prev.map((it) => {
								if (it.id !== entry.id) return it;
								if (it.thumbnailUrl) URL.revokeObjectURL(it.thumbnailUrl);
								return { ...it, thumbnailUrl: thumbUrl };
							}),
						);
					});
				}
			} catch (err) {
				setItems((prev) =>
					prev.map((it) =>
						it.id === entry.id
							? {
									...it,
									status: "error",
									error:
										err instanceof Error
											? err.message
											: "Failed to parse image.",
								}
							: it,
					),
				);
			}
		});

		setStatusMessage(
			`Scanned ${files.length} ${files.length === 1 ? "file" : "files"}.`,
		);
	}, []);

	const handleLoadSample = useCallback(async () => {
		setIsLoadingSample(true);
		try {
			const sampleFile = await createSampleAiImageFile();
			await handleFilesAdded([sampleFile]);
		} finally {
			setIsLoadingSample(false);
		}
	}, [handleFilesAdded]);

	const cleanOneItem = useCallback(
		async (item: ImageQueueItem, currentOptions: CleanOptions) => {
			setItems((prev) =>
				prev.map((it) =>
					it.id === item.id ? { ...it, status: "cleaning", error: null } : it,
				),
			);

			try {
				const result = await cleanerClient.clean(item.file, currentOptions);
				const blob =
					result.cleanedBlob ??
					new Blob([result.cleanedBuffer ?? new ArrayBuffer(0)], {
						type: result.outputMimeType,
					});
				const nextCleanedUrl = URL.createObjectURL(blob);

				setItems((prev) =>
					prev.map((it) => {
						if (it.id !== item.id) return it;
						if (it.cleanedUrl) URL.revokeObjectURL(it.cleanedUrl);
						return {
							...it,
							status: "cleaned",
							cleanResult: result,
							cleanedUrl: nextCleanedUrl,
							error: null,
						};
					}),
				);
			} catch (err) {
				setItems((prev) =>
					prev.map((it) =>
						it.id === item.id
							? {
									...it,
									status: "error",
									error:
										err instanceof Error
											? err.message
											: "Failed to strip metadata.",
								}
							: it,
					),
				);
			}
		},
		[],
	);

	const handleCleanSingle = useCallback(
		async (id: string) => {
			const target = itemsRef.current.find((it) => it.id === id);
			if (!target) return;
			await cleanOneItem(target, options);
			setStatusMessage(`Cleaned and verified ${target.file.name}.`);
		},
		[cleanOneItem, options],
	);

	const handleCleanAll = useCallback(async () => {
		const queue = itemsRef.current.filter((it) => it.status !== "scanning");
		if (queue.length === 0) return;

		setIsBatchCleaning(true);
		try {
			await runWithConcurrency(queue, 2, async (item) => {
				await cleanOneItem(item, options);
			});
			setStatusMessage(
				`Cleaned and verified ${queue.length} ${
					queue.length === 1 ? "file" : "files"
				}.`,
			);
		} finally {
			setIsBatchCleaning(false);
		}
	}, [cleanOneItem, options]);

	const handleDownloadSingle = useCallback(
		(item: ImageQueueItem) => {
			if (!item.cleanedUrl || !item.cleanResult) return;
			const anchor = document.createElement("a");
			anchor.href = item.cleanedUrl;
			anchor.download = buildCleanedFilename(
				item.file.name,
				suffix,
				item.cleanResult.outputExtension,
			);
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
		},
		[suffix],
	);

	const handleDownloadAll = useCallback(async () => {
		const cleanedItems = itemsRef.current.filter(
			(it) => it.status === "cleaned" && it.cleanedUrl && it.cleanResult,
		);
		if (cleanedItems.length === 0) return;
		if (cleanedItems.length === 1) {
			handleDownloadSingle(cleanedItems[0]);
			return;
		}

		const totalBytes = cleanedItems.reduce(
			(sum, item) => sum + (item.cleanResult?.cleanedSize ?? 0),
			0,
		);
		// Guard against reading multi-hundred-MB video batches into a single in-memory ZIP
		if (totalBytes > 250 * 1024 * 1024) {
			cleanedItems.forEach((item, index) => {
				setTimeout(() => handleDownloadSingle(item), index * 180);
			});
			setStatusMessage(
				`Downloading ${cleanedItems.length} cleaned files individually (batch exceeds 250 MB ZIP threshold).`,
			);
			return;
		}

		const zipFiles = await Promise.all(
			cleanedItems.map(async (item) => {
				const cleanResult = item.cleanResult;
				if (!cleanResult) return null;
				const data = cleanResult.cleanedBlob
					? new Uint8Array(await cleanResult.cleanedBlob.arrayBuffer())
					: cleanResult.cleanedBuffer
						? new Uint8Array(cleanResult.cleanedBuffer)
						: null;
				if (!data) return null;
				return {
					name: buildCleanedFilename(
						item.file.name,
						suffix,
						cleanResult.outputExtension,
					),
					data,
				};
			}),
		);
		const validZipFiles = zipFiles.filter(
			(entry): entry is NonNullable<typeof entry> => entry !== null,
		);
		if (validZipFiles.length === 0) return;

		const zipBlob = createZipBlob(validZipFiles);
		const zipUrl = URL.createObjectURL(zipBlob);
		const anchor = document.createElement("a");
		anchor.href = zipUrl;
		anchor.download = "synthidclear-cleaned-batch.zip";
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		setTimeout(() => URL.revokeObjectURL(zipUrl), 1500);
	}, [handleDownloadSingle, suffix]);

	const handleRemoveItem = useCallback((id: string) => {
		setItems((prev) => {
			const target = prev.find((it) => it.id === id);
			if (target) {
				URL.revokeObjectURL(target.previewUrl);
				if (target.thumbnailUrl) URL.revokeObjectURL(target.thumbnailUrl);
				if (target.cleanedUrl) URL.revokeObjectURL(target.cleanedUrl);
			}
			const next = prev.filter((it) => it.id !== id);
			setSelectedId((curr) => (curr === id ? (next[0]?.id ?? null) : curr));
			return next;
		});
	}, []);

	const handleClearAll = useCallback(() => {
		for (const item of itemsRef.current) {
			URL.revokeObjectURL(item.previewUrl);
			if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
			if (item.cleanedUrl) URL.revokeObjectURL(item.cleanedUrl);
		}
		setItems([]);
		setSelectedId(null);
		setStatusMessage("Cleared all files.");
	}, []);

	const stats = useMemo(() => {
		let metadataEntriesFound = 0;
		let aiFlagsFound = 0;
		let cleanedVerified = 0;
		for (const item of items) {
			metadataEntriesFound += item.originalMeta?.strippableCount ?? 0;
			aiFlagsFound += item.originalMeta?.aiFlagCount ?? 0;
			if (item.status === "cleaned" && item.cleanResult) {
				const ok =
					item.cleanResult.stripScope === "ai-only"
						? item.cleanResult.verification.aiFlagCount === 0
						: item.cleanResult.verification.strippableCount === 0;
				if (ok) cleanedVerified++;
			}
		}
		return {
			imagesLoaded: items.length,
			metadataEntriesFound,
			aiFlagsFound,
			cleanedVerified,
		};
	}, [items]);

	const selectedItem = useMemo(
		() => items.find((it) => it.id === selectedId) ?? items[0] ?? null,
		[items, selectedId],
	);

	const isBusy =
		isBatchCleaning ||
		items.some((it) => it.status === "cleaning" || it.status === "scanning");

	return {
		items,
		selectedId,
		setSelectedId,
		selectedItem,
		options,
		setOptions,
		suffix,
		setSuffix,
		isLoadingSample,
		isBusy,
		statusMessage,
		stats,
		handleFilesAdded,
		handleLoadSample,
		handleCleanSingle,
		handleCleanAll,
		handleDownloadSingle,
		handleDownloadAll,
		handleRemoveItem,
		handleClearAll,
	};
}

export type CleanerState = ReturnType<typeof useCleanerState>;
