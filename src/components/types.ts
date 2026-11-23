import type { CleanResult, ParseResult } from "#/lib/metadata";

export type QueueItemStatus =
	| "scanning"
	| "ready"
	| "cleaning"
	| "cleaned"
	| "error";

export interface ImageQueueItem {
	id: string;
	file: File;
	previewUrl: string;
	thumbnailUrl?: string | null;
	status: QueueItemStatus;
	originalMeta: ParseResult | null;
	cleanResult: CleanResult | null;
	cleanedUrl: string | null;
	error: string | null;
}
