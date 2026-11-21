/// <reference lib="webworker" />

import {
	type CleanOptions,
	type CleanResult,
	cleanImageBuffer,
	type ParseResult,
	parseImageMetadata,
} from "../lib/metadata";

export type WorkerRequest =
	| {
			id: number;
			type: "inspect";
			buffer: ArrayBuffer;
	  }
	| {
			id: number;
			type: "clean";
			buffer: ArrayBuffer;
			options: CleanOptions;
	  };

export type WorkerResponse =
	| {
			id: number;
			ok: true;
			type: "inspect";
			result: ParseResult;
	  }
	| {
			id: number;
			ok: true;
			type: "clean";
			result: CleanResult;
	  }
	| {
			id: number;
			ok: false;
			error: string;
	  };

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const msg = event.data;
	try {
		if (msg.type === "inspect") {
			const result = await parseImageMetadata(msg.buffer);
			const response: WorkerResponse = {
				id: msg.id,
				ok: true,
				type: "inspect",
				result,
			};
			ctx.postMessage(response);
		} else if (msg.type === "clean") {
			const result = await cleanImageBuffer(msg.buffer, msg.options);
			const response: WorkerResponse = {
				id: msg.id,
				ok: true,
				type: "clean",
				result,
			};
			ctx.postMessage(
				response,
				result.cleanedBuffer ? [result.cleanedBuffer] : [],
			);
		}
	} catch (err) {
		const response: WorkerResponse = {
			id: msg.id,
			ok: false,
			error: err instanceof Error ? err.message : "Image processing failed.",
		};
		ctx.postMessage(response);
	}
};
