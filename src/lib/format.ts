export const ACCEPTED_MEDIA_ACCEPT =
	"image/png,image/jpeg,image/webp,image/heic,image/heif,image/avif,video/mp4,video/quicktime,.png,.jpg,.jpeg,.webp,.heic,.heif,.avif,.mp4,.mov";

const ACCEPTED_MEDIA_MIME_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/heic",
	"image/heif",
	"image/avif",
	"video/mp4",
	"video/quicktime",
]);

export function filterAcceptedMediaFiles(fileList: FileList | File[]): File[] {
	return Array.from(fileList).filter(
		(file) =>
			ACCEPTED_MEDIA_MIME_TYPES.has(file.type) ||
			/\.(png|jpe?g|webp|heic|heif|avif|mp4|mov)$/i.test(file.name),
	);
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function buildCleanedFilename(
	originalName: string,
	suffix: string,
	extension: string,
): string {
	const cleanSuffix = suffix.trim() || "_clean";
	const lastDot = originalName.lastIndexOf(".");
	const base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
	const safeExt = extension.replace(/^\./, "") || "png";
	return `${base}${cleanSuffix}.${safeExt}`;
}

export function formatDeltaPercent(before: number, after: number): string {
	if (before <= 0) return "0%";
	const diff = before - after;
	const pct = (diff / before) * 100;
	if (Math.abs(pct) < 0.05) return "0%";
	return pct > 0 ? `-${pct.toFixed(1)}%` : `+${Math.abs(pct).toFixed(1)}%`;
}
