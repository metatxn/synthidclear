/// <reference lib="webworker" />

import type { IconPosition } from "../lib/iconRemoval";
import {
	type IconVideoExportOptions,
	runIconVideoConversion,
} from "../lib/iconVideoExport";

type WorkerInMessage =
	| {
			type: "start";
			file: File;
			positions: readonly IconPosition[];
			options: IconVideoExportOptions;
	  }
	| {
			type: "cancel";
	  };

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;
let activeController: AbortController | null = null;

ctx.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
	const msg = event.data;

	if (msg.type === "cancel") {
		activeController?.abort();
		activeController = null;
		return;
	}

	if (msg.type === "start") {
		activeController?.abort();
		const controller = new AbortController();
		activeController = controller;

		try {
			const result = await runIconVideoConversion(
				msg.file,
				msg.positions,
				controller.signal,
				(progress) => {
					ctx.postMessage({ type: "progress", progress });
				},
				msg.options,
			);

			if (controller.signal.aborted) return;

			if (result.blob) {
				const buffer = await result.blob.arrayBuffer();
				ctx.postMessage(
					{
						type: "done",
						buffer,
						mimeType: result.mimeType,
						extension: result.extension,
						streamedToDisk: false,
					},
					[buffer],
				);
			} else {
				ctx.postMessage({
					type: "done",
					buffer: null,
					mimeType: result.mimeType,
					extension: result.extension,
					streamedToDisk: result.streamedToDisk,
				});
			}
		} catch (error) {
			if (controller.signal.aborted) return;
			ctx.postMessage({
				type: "error",
				error:
					error instanceof Error
						? error.message
						: "The video export could not finish.",
			});
		} finally {
			if (activeController === controller) {
				activeController = null;
			}
		}
	}
};
