export interface IconRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface IconPosition {
	time: number;
	region: IconRegion;
}

export const ICON_MEDIA_ACCEPT =
	".png,.jpg,.jpeg,.webp,.avif,.mp4,.mov,.webm,.mkv";

export function getIconMediaKind(file: File): "image" | "video" | undefined {
	if (/\.(mp4|mov|webm|mkv)$/i.test(file.name)) return "video";
	if (/\.(png|jpe?g|webp|avif)$/i.test(file.name)) return "image";
	if (/^video\/(mp4|quicktime|webm|x-matroska|matroska)$/.test(file.type))
		return "video";
	if (/^image\/(png|jpeg|webp|avif)$/.test(file.type)) return "image";
}

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

export function regionAtTime(
	positions: readonly IconPosition[],
	time: number,
): IconRegion | undefined {
	const nextIndex = positions.findIndex((position) => position.time > time);
	if (nextIndex === 0) return positions[0]?.region;
	if (nextIndex === -1) return positions.at(-1)?.region;

	const previous = positions[nextIndex - 1];
	const next = positions[nextIndex];
	const fraction = (time - previous.time) / (next.time - previous.time);
	const interpolate = (start: number, end: number) =>
		Math.round(start + (end - start) * fraction);
	const x = interpolate(previous.region.x, next.region.x);
	const y = interpolate(previous.region.y, next.region.y);
	return {
		x,
		y,
		width:
			interpolate(
				previous.region.x + previous.region.width,
				next.region.x + next.region.width,
			) - x,
		height:
			interpolate(
				previous.region.y + previous.region.height,
				next.region.y + next.region.height,
			) - y,
	};
}

export type RepairCanvasContext =
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D;

export function getRepairContext(
	canvas: HTMLCanvasElement | OffscreenCanvas,
): RepairCanvasContext {
	const context = canvas.getContext("2d", {
		willReadFrequently: true,
	}) as RepairCanvasContext | null;
	if (!context)
		throw new Error("Your browser could not initialize the editor.");
	return context;
}

export function repairRegion(
	context: RepairCanvasContext,
	region?: IconRegion,
) {
	if (!region) return;
	const { width, height } = context.canvas;
	const x = clamp(Math.round(region.x), 0, Math.max(0, width - 1));
	const y = clamp(Math.round(region.y), 0, Math.max(0, height - 1));
	const boxWidth = clamp(Math.round(region.width), 0, width - x);
	const boxHeight = clamp(Math.round(region.height), 0, height - y);
	if (boxWidth < 1 || boxHeight < 1) return;

	const left = x > 0;
	const right = x + boxWidth < width;
	const top = y > 0;
	const bottom = y + boxHeight < height;
	if (!left && !right && !top && !bottom) return;

	// Read just the selection and its one-pixel border. Only the border supplies
	// replacement colors, so pixels from the icon never feed back into the fill.
	const offsetX = Number(left);
	const offsetY = Number(top);
	const borderX = x - offsetX;
	const borderY = y - offsetY;
	const pixels = context.getImageData(
		borderX,
		borderY,
		boxWidth + offsetX + Number(right),
		boxHeight + offsetY + Number(bottom),
	);
	const { data, width: stride } = pixels;

	for (let row = 0; row < boxHeight; row++) {
		const scanline = (row + offsetY) * stride;
		const topWeight = top ? 1 / (row + 1) : 0;
		const bottomWeight = bottom ? 1 / (boxHeight - row) : 0;
		const leftPixel = scanline * 4;
		const rightPixel = (scanline + stride - 1) * 4;

		for (let col = 0; col < boxWidth; col++) {
			const column = col + offsetX;
			const pixel = (scanline + column) * 4;
			const topPixel = column * 4;
			const bottomPixel = ((pixels.height - 1) * stride + column) * 4;
			const leftWeight = left ? 1 / (col + 1) : 0;
			const rightWeight = right ? 1 / (boxWidth - col) : 0;
			const total = leftWeight + rightWeight + topWeight + bottomWeight;

			for (let channel = 0; channel < 4; channel++) {
				data[pixel + channel] =
					(data[leftPixel + channel] * leftWeight +
						data[rightPixel + channel] * rightWeight +
						data[topPixel + channel] * topWeight +
						data[bottomPixel + channel] * bottomWeight) /
					total;
			}
		}
	}

	context.putImageData(
		pixels,
		borderX,
		borderY,
		offsetX,
		offsetY,
		boxWidth,
		boxHeight,
	);
}

export function drawRepairedFrame(
	context: RepairCanvasContext,
	source: CanvasImageSource,
	region?: IconRegion,
) {
	const { width, height } = context.canvas;
	context.clearRect(0, 0, width, height);
	context.drawImage(source, 0, 0, width, height);
	repairRegion(context, region);
}

export function exportIconImage(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error("The edited image could not be exported."));
		}, "image/png");
	});
}
