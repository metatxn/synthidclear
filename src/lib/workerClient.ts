import type { WorkerRequest, WorkerResponse } from "../workers/cleaner.worker";
import {
	type CleanOptions,
	type CleanResult,
	cleanImageBuffer,
	detectImageFormat,
	isVideoFormat,
	type ParseResult,
	parseImageMetadata,
	parseMp4Metadata,
	stripMp4Lossless,
} from "./metadata";

interface PendingRequest {
	resolve: (value: ParseResult | CleanResult) => void;
	reject: (reason: Error) => void;
}

class CleanerWorkerClient {
	private worker: Worker | null = null;
	private nextId = 1;
	private pending = new Map<number, PendingRequest>();
	private workerUnavailable = false;

	private getWorker(): Worker | null {
		if (typeof window === "undefined" || typeof Worker === "undefined") {
			return null;
		}
		if (this.workerUnavailable) {
			return null;
		}
		if (!this.worker) {
			try {
				this.worker = new Worker(
					new URL("../workers/cleaner.worker.ts", import.meta.url),
					{ type: "module" },
				);
				this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
					const data = event.data;
					const entry = this.pending.get(data.id);
					if (!entry) return;
					this.pending.delete(data.id);
					if (data.ok) {
						entry.resolve(data.result);
					} else {
						entry.reject(new Error(data.error));
					}
				};
				this.worker.onerror = () => {
					this.workerUnavailable = true;
					this.worker?.terminate();
					this.worker = null;
					for (const [, entry] of this.pending) {
						entry.reject(new Error("Web Worker failed; falling back."));
					}
					this.pending.clear();
				};
			} catch {
				this.workerUnavailable = true;
				return null;
			}
		}
		return this.worker;
	}

	async inspect(file: File): Promise<ParseResult> {
		const headBuf = await file.slice(0, 64).arrayBuffer();
		const format = detectImageFormat(new Uint8Array(headBuf));
		if (isVideoFormat(format)) {
			// Videos use zero-copy File.slice() directly so multi-hundred-MB payloads never hit RAM
			return parseMp4Metadata(file);
		}

		const buffer = await file.arrayBuffer();
		const worker = this.getWorker();
		if (!worker) {
			return parseImageMetadata(buffer);
		}
		try {
			const id = this.nextId++;
			return (await new Promise<ParseResult | CleanResult>(
				(resolve, reject) => {
					this.pending.set(id, { resolve, reject });
					const req: WorkerRequest = { id, type: "inspect", buffer };
					worker.postMessage(req, [buffer]);
				},
			)) as ParseResult;
		} catch {
			// Fallback to direct parsing if worker fails
			const freshBuffer = await file.arrayBuffer();
			return parseImageMetadata(freshBuffer);
		}
	}

	async clean(file: File, options: CleanOptions): Promise<CleanResult> {
		const headBuf = await file.slice(0, 64).arrayBuffer();
		const format = detectImageFormat(new Uint8Array(headBuf));
		if (isVideoFormat(format)) {
			return stripMp4Lossless(file, options.stripScope);
		}

		const buffer = await file.arrayBuffer();
		const worker = this.getWorker();
		// If Deep Clean is requested in a browser without OffscreenCanvas, run on main thread canvas directly
		const canDeepCleanInWorker =
			options.mode === "lossless" || typeof OffscreenCanvas !== "undefined";

		if (!worker || !canDeepCleanInWorker) {
			return cleanImageBuffer(buffer, options);
		}

		try {
			const id = this.nextId++;
			return (await new Promise<ParseResult | CleanResult>(
				(resolve, reject) => {
					this.pending.set(id, { resolve, reject });
					const req: WorkerRequest = { id, type: "clean", buffer, options };
					worker.postMessage(req, [buffer]);
				},
			)) as CleanResult;
		} catch {
			const freshBuffer = await file.arrayBuffer();
			return cleanImageBuffer(freshBuffer, options);
		}
	}
}

export const cleanerClient = new CleanerWorkerClient();

/**
 * Concurrency-limited batch runner (default max 2 concurrent images for mobile RAM stability).
 */
export async function runWithConcurrency<T>(
	items: readonly T[],
	concurrency: number,
	task: (item: T) => Promise<void>,
): Promise<void> {
	const limit = Math.max(1, concurrency);
	let index = 0;

	async function worker() {
		while (index < items.length) {
			const current = items[index++];
			await task(current);
		}
	}

	const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
		worker(),
	);
	await Promise.all(runners);
}
