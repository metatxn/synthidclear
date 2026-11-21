import type { ImageFormat, MetadataCategory, MetadataEntry } from "./types";

const utf8Decoder = new TextDecoder("utf-8", { fatal: false });
const latin1Decoder = new TextDecoder("latin1");

const CRC32_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c >>> 0;
	}
	return table;
})();

export function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) {
		crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

const AVIF_BRANDS = new Set(["avif", "avis"]);
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);
const MOV_BRANDS = new Set(["qt  "]);
const MP4_BRANDS = new Set([
	"isom",
	"iso2",
	"iso3",
	"iso4",
	"iso5",
	"iso6",
	"mp41",
	"mp42",
	"mp71",
	"avc1",
	"M4V ",
	"M4A ",
	"f4v ",
	"dash",
	"msdh",
	"msix",
	"3gp4",
	"3gp5",
	"3gp6",
]);

export function isVideoFormat(format: ImageFormat | undefined): boolean {
	return format === "mp4" || format === "mov";
}

export function detectImageFormat(bytes: Uint8Array): ImageFormat {
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	) {
		return "png";
	}
	if (
		bytes.length >= 3 &&
		bytes[0] === 0xff &&
		bytes[1] === 0xd8 &&
		bytes[2] === 0xff
	) {
		return "jpeg";
	}
	if (
		bytes.length >= 12 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return "webp";
	}
	if (bytes.length >= 12 && readAscii(bytes, 4, 4) === "ftyp") {
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		const boxSize = Math.min(bytes.length, view.getUint32(0, false));
		const majorBrand = readAscii(bytes, 8, 4);
		if (AVIF_BRANDS.has(majorBrand)) return "avif";
		if (HEIC_BRANDS.has(majorBrand)) return "heic";
		if (MOV_BRANDS.has(majorBrand)) return "mov";
		if (MP4_BRANDS.has(majorBrand)) return "mp4";
		for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
			const compat = readAscii(bytes, offset, 4);
			if (AVIF_BRANDS.has(compat)) return "avif";
			if (HEIC_BRANDS.has(compat)) return "heic";
			if (MOV_BRANDS.has(compat)) return "mov";
			if (MP4_BRANDS.has(compat)) return "mp4";
		}
	}
	return "unknown";
}

export function formatToMime(format: ImageFormat): string {
	switch (format) {
		case "png":
			return "image/png";
		case "jpeg":
			return "image/jpeg";
		case "webp":
			return "image/webp";
		case "heic":
			return "image/heic";
		case "avif":
			return "image/avif";
		case "mp4":
			return "video/mp4";
		case "mov":
			return "video/quicktime";
		default:
			return "application/octet-stream";
	}
}

export function mimeToExtension(mime: string): string {
	switch (mime) {
		case "image/png":
			return "png";
		case "image/jpeg":
			return "jpg";
		case "image/webp":
			return "webp";
		case "image/heic":
		case "image/heif":
			return "heic";
		case "image/avif":
			return "avif";
		case "video/mp4":
			return "mp4";
		case "video/quicktime":
			return "mov";
		default:
			return "bin";
	}
}

export function decodeUtf8(bytes: Uint8Array): string {
	return utf8Decoder.decode(bytes);
}

export function decodeLatin1(bytes: Uint8Array): string {
	return latin1Decoder.decode(bytes);
}

export function readAscii(
	bytes: Uint8Array,
	offset: number,
	length: number,
): string {
	const end = Math.min(bytes.length, offset + length);
	let result = "";
	for (let i = offset; i < end; i++) {
		result += String.fromCharCode(bytes[i]);
	}
	return result;
}

export function sanitizeDisplayText(text: string, maxLength = 2400): string {
	const cleaned = text.replace(/\0+/g, " ").trim();
	if (cleaned.length <= maxLength) {
		return cleaned;
	}
	return `${cleaned.slice(0, maxLength)}… (${cleaned.length.toLocaleString()} chars total)`;
}

const AI_SIGNAL_PATTERNS = [
	/\bc2pa\b/i,
	/\bjumbf?\b/i,
	/trainedAlgorithmicMedia/i,
	/compositeWithTrainedAlgorithmicMedia/i,
	/algorithmicMedia/i,
	/DigitalSourceType/i,
	/\bcontent\s*credentials\b/i,
	/\bmidjourney\b/i,
	/\bstable\s*diffusion\b/i,
	/\bcomfyui\b/i,
	/\bautomatic1111\b/i,
	/\bnovelai\b/i,
	/\bdall[- ]?e\b/i,
	/\badobe\s*firefly\b/i,
	/\bimagen\b/i,
	/\bsynthid\b/i,
	/\bflux\.?1\b/i,
	/\bsora\b/i,
	/\brunway\b/i,
	/\bkling\b/i,
	/\bveo\b/i,
	/\bgoogle\s*ai\b/i,
	/\bgemini\b/i,
	/\bopenai\b/i,
	/\bai[- ]generated\b/i,
	/\bnegative prompt:/i,
	/\bcfg scale:/i,
	/\bsampler:/i,
];

export function hasAiSignal(key: string, value: string): boolean {
	const lowerKey = key.toLowerCase();
	if (
		lowerKey === "parameters" ||
		lowerKey === "prompt" ||
		lowerKey === "workflow" ||
		lowerKey.includes("c2pa") ||
		lowerKey.includes("jumbf") ||
		lowerKey.includes("digitalsourcetype")
	) {
		return true;
	}
	const combined = `${key} ${value}`;
	return AI_SIGNAL_PATTERNS.some((pattern) => pattern.test(combined));
}

export function extractReadableStrings(
	bytes: Uint8Array,
	minLength = 5,
	maxItems = 14,
): string[] {
	const found: string[] = [];
	const seen = new Set<string>();
	let current = "";
	for (let i = 0; i < bytes.length; i++) {
		const code = bytes[i];
		if (code >= 0x20 && code <= 0x7e) {
			current += String.fromCharCode(code);
		} else {
			if (current.length >= minLength) {
				const trimmed = current.trim();
				if (
					trimmed.length >= minLength &&
					/[a-zA-Z]{3,}/.test(trimmed) &&
					!seen.has(trimmed)
				) {
					seen.add(trimmed);
					found.push(trimmed);
					if (found.length >= maxItems) break;
				}
			}
			current = "";
		}
	}
	if (
		current.length >= minLength &&
		found.length < maxItems &&
		/[a-zA-Z]{3,}/.test(current) &&
		!seen.has(current.trim())
	) {
		found.push(current.trim());
	}
	return found;
}

export async function decompressZlib(
	data: Uint8Array,
): Promise<Uint8Array | null> {
	if (typeof DecompressionStream === "undefined") {
		return null;
	}
	try {
		const copy = new Uint8Array(data.byteLength);
		copy.set(data);
		const stream = new Blob([copy])
			.stream()
			.pipeThrough(new DecompressionStream("deflate"));
		const arrayBuffer = await new Response(stream).arrayBuffer();
		return new Uint8Array(arrayBuffer);
	} catch {
		return null;
	}
}

export function parseXmpEntries(
	xmlString: string,
	source: string,
	byteSize: number,
	idPrefix: string,
): MetadataEntry[] {
	const entries: MetadataEntry[] = [];
	const seenKeys = new Set<string>();

	const tagDefs: Array<{ label: string; patterns: RegExp[] }> = [
		{
			label: "XMP: DigitalSourceType",
			patterns: [
				/DigitalSourceType=["']([^"']+)["']/i,
				/<[^:>]*:?DigitalSourceType[^>]*>([^<]+)<\//i,
			],
		},
		{
			label: "XMP: CreatorTool",
			patterns: [
				/CreatorTool=["']([^"']+)["']/i,
				/<[^:>]*:?CreatorTool[^>]*>([^<]+)<\//i,
			],
		},
		{
			label: "XMP: Software / Agent",
			patterns: [
				/softwareAgent=["']([^"']+)["']/i,
				/<[^:>]*:?softwareAgent[^>]*>([^<]+)<\//i,
				/Software=["']([^"']+)["']/i,
			],
		},
		{
			label: "XMP: Credit",
			patterns: [
				/Credit=["']([^"']+)["']/i,
				/<[^:>]*:?Credit[^>]*>([^<]+)<\//i,
			],
		},
		{
			label: "XMP: Description",
			patterns: [
				/<dc:description[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i,
			],
		},
		{
			label: "XMP: Creator",
			patterns: [/<dc:creator[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i],
		},
		{
			label: "XMP: CreateDate",
			patterns: [
				/CreateDate=["']([^"']+)["']/i,
				/<[^:>]*:?CreateDate[^>]*>([^<]+)<\//i,
			],
		},
		{
			label: "XMP: C2PA Manifest",
			patterns: [/(c2pa\.[a-zA-Z0-9._-]+|urn:uuid:[a-f0-9-]+)/i],
		},
	];

	let idx = 0;
	for (const def of tagDefs) {
		for (const pattern of def.patterns) {
			const match = xmlString.match(pattern);
			if (match?.[1] && !seenKeys.has(def.label)) {
				const value = sanitizeDisplayText(match[1]);
				seenKeys.add(def.label);
				const aiFlag = hasAiSignal(def.label, value);
				entries.push({
					id: `${idPrefix}-xmp-${idx++}`,
					key: def.label,
					value,
					category: aiFlag ? "ai-provenance" : "xmp",
					source,
					byteSize,
					isAiFlag: aiFlag,
				});
				break;
			}
		}
	}

	if (entries.length === 0) {
		const aiFlag = hasAiSignal("XMP Packet", xmlString);
		entries.push({
			id: `${idPrefix}-xmp-raw`,
			key: "XMP Metadata Packet",
			value: sanitizeDisplayText(xmlString, 900),
			category: aiFlag ? "ai-provenance" : "xmp",
			source,
			byteSize,
			isAiFlag: aiFlag,
		});
	}

	return entries;
}

const IFD0_TAGS: Record<number, string> = {
	270: "ImageDescription",
	271: "Make",
	272: "Model",
	274: "Orientation",
	305: "Software",
	306: "DateTime",
	315: "Artist",
	33432: "Copyright",
};

const EXIF_SUB_TAGS: Record<number, string> = {
	33434: "ExposureTime",
	33437: "FNumber",
	34855: "ISO",
	36867: "DateTimeOriginal",
	36868: "CreateDate",
	37510: "UserComment",
	42033: "BodySerialNumber",
	42036: "LensModel",
};

function readTiffValue(
	view: DataView,
	bytes: Uint8Array,
	tiffStart: number,
	entryOffset: number,
	littleEndian: boolean,
): string | null {
	const type = view.getUint16(entryOffset + 2, littleEndian);
	const count = view.getUint32(entryOffset + 4, littleEndian);
	const typeSizes: Record<number, number> = {
		1: 1,
		2: 1,
		3: 2,
		4: 4,
		5: 8,
		7: 1,
		9: 4,
		10: 8,
	};
	const unitSize = typeSizes[type];
	if (!unitSize || count === 0 || count > 65536) return null;

	const totalBytes = unitSize * count;
	const valueOffset =
		totalBytes <= 4
			? entryOffset + 8
			: tiffStart + view.getUint32(entryOffset + 8, littleEndian);

	if (valueOffset < tiffStart || valueOffset + totalBytes > bytes.length) {
		return null;
	}

	if (type === 2) {
		// ASCII
		return sanitizeDisplayText(
			decodeUtf8(bytes.subarray(valueOffset, valueOffset + totalBytes)),
			600,
		);
	}
	if (type === 7) {
		// UNDEFINED (e.g. UserComment)
		const slice = bytes.subarray(valueOffset, valueOffset + totalBytes);
		if (totalBytes > 8 && readAscii(slice, 0, 5) === "ASCII") {
			return sanitizeDisplayText(decodeUtf8(slice.subarray(8)), 600);
		}
		return sanitizeDisplayText(decodeUtf8(slice), 600);
	}
	if (type === 3) {
		return String(view.getUint16(valueOffset, littleEndian));
	}
	if (type === 4) {
		return String(view.getUint32(valueOffset, littleEndian));
	}
	if (type === 5) {
		const num = view.getUint32(valueOffset, littleEndian);
		const den = view.getUint32(valueOffset + 4, littleEndian);
		if (den === 0) return String(num);
		if (count === 3 && valueOffset + 24 <= bytes.length) {
			const d = num / den;
			const mNum = view.getUint32(valueOffset + 8, littleEndian);
			const mDen = view.getUint32(valueOffset + 12, littleEndian) || 1;
			const sNum = view.getUint32(valueOffset + 16, littleEndian);
			const sDen = view.getUint32(valueOffset + 20, littleEndian) || 1;
			return `${d.toFixed(0)}° ${(mNum / mDen).toFixed(0)}' ${(sNum / sDen).toFixed(2)}"`;
		}
		return `${(num / den).toFixed(2)}`;
	}
	return null;
}

function walkIfd(
	view: DataView,
	bytes: Uint8Array,
	tiffStart: number,
	ifdOffset: number,
	littleEndian: boolean,
	tagMap: Record<number, string>,
	source: string,
	idPrefix: string,
	entries: MetadataEntry[],
): { exifOffset?: number; gpsOffset?: number } {
	const pointers: { exifOffset?: number; gpsOffset?: number } = {};
	const absOffset = tiffStart + ifdOffset;
	if (absOffset < tiffStart || absOffset + 2 > bytes.length) return pointers;

	const count = view.getUint16(absOffset, littleEndian);
	const safeCount = Math.min(count, 256);

	for (let i = 0; i < safeCount; i++) {
		const entryOffset = absOffset + 2 + i * 12;
		if (entryOffset + 12 > bytes.length) break;
		const tag = view.getUint16(entryOffset, littleEndian);

		if (tag === 0x8769) {
			pointers.exifOffset = view.getUint32(entryOffset + 8, littleEndian);
			continue;
		}
		if (tag === 0x8825) {
			pointers.gpsOffset = view.getUint32(entryOffset + 8, littleEndian);
			continue;
		}

		const tagName = tagMap[tag];
		if (!tagName) continue;
		const val = readTiffValue(
			view,
			bytes,
			tiffStart,
			entryOffset,
			littleEndian,
		);
		if (!val) continue;

		const aiFlag = hasAiSignal(tagName, val);
		entries.push({
			id: `${idPrefix}-exif-${tag.toString(16)}-${i}`,
			key: `EXIF: ${tagName}`,
			value: val,
			category: aiFlag ? "ai-provenance" : "exif",
			source,
			byteSize: 12,
			isAiFlag: aiFlag,
		});
	}
	return pointers;
}

export function parseExifEntries(
	exifPayload: Uint8Array,
	source: string,
	idPrefix: string,
): MetadataEntry[] {
	const entries: MetadataEntry[] = [];
	let tiffStart = 0;
	if (exifPayload.length >= 6 && readAscii(exifPayload, 0, 6) === "Exif\0\0") {
		tiffStart = 6;
	}

	if (tiffStart + 8 > exifPayload.length) {
		return [
			{
				id: `${idPrefix}-exif-blob`,
				key: "EXIF Header Block",
				value: `${exifPayload.length.toLocaleString()} bytes`,
				category: "exif",
				source,
				byteSize: exifPayload.length,
				isAiFlag: false,
			},
		];
	}

	const endianMark = readAscii(exifPayload, tiffStart, 2);
	if (endianMark !== "II" && endianMark !== "MM") {
		return [
			{
				id: `${idPrefix}-exif-blob`,
				key: "EXIF Metadata Block",
				value: `${exifPayload.length.toLocaleString()} bytes`,
				category: "exif",
				source,
				byteSize: exifPayload.length,
				isAiFlag: false,
			},
		];
	}

	const littleEndian = endianMark === "II";
	const view = new DataView(
		exifPayload.buffer,
		exifPayload.byteOffset,
		exifPayload.byteLength,
	);
	const magic = view.getUint16(tiffStart + 2, littleEndian);
	if (magic !== 0x002a) {
		return [
			{
				id: `${idPrefix}-exif-blob`,
				key: "EXIF Metadata Block",
				value: `${exifPayload.length.toLocaleString()} bytes`,
				category: "exif",
				source,
				byteSize: exifPayload.length,
				isAiFlag: false,
			},
		];
	}

	const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
	const pointers = walkIfd(
		view,
		exifPayload,
		tiffStart,
		firstIfdOffset,
		littleEndian,
		IFD0_TAGS,
		source,
		idPrefix,
		entries,
	);

	if (pointers.exifOffset) {
		walkIfd(
			view,
			exifPayload,
			tiffStart,
			pointers.exifOffset,
			littleEndian,
			EXIF_SUB_TAGS,
			source,
			`${idPrefix}-sub`,
			entries,
		);
	}

	if (pointers.gpsOffset) {
		const gpsTags: Record<number, string> = {
			1: "GPSLatitudeRef",
			2: "GPSLatitude",
			3: "GPSLongitudeRef",
			4: "GPSLongitude",
			6: "GPSAltitude",
		};
		const gpsEntries: MetadataEntry[] = [];
		walkIfd(
			view,
			exifPayload,
			tiffStart,
			pointers.gpsOffset,
			littleEndian,
			gpsTags,
			source,
			`${idPrefix}-gps`,
			gpsEntries,
		);
		if (gpsEntries.length > 0) {
			entries.push(...gpsEntries);
		} else {
			entries.push({
				id: `${idPrefix}-gps-present`,
				key: "EXIF: GPS Location Block",
				value: "GPS IFD metadata present (coordinates embedded)",
				category: "exif",
				source,
				byteSize: 12,
				isAiFlag: false,
			});
		}
	}

	if (entries.length === 0) {
		entries.push({
			id: `${idPrefix}-exif-raw`,
			key: "EXIF Metadata Segment",
			value: `Binary EXIF header (${exifPayload.length.toLocaleString()} bytes)`,
			category: "exif",
			source,
			byteSize: exifPayload.length,
			isAiFlag: false,
		});
	}

	return entries;
}

export function extractIccProfileName(iccBytes: Uint8Array): string | null {
	// Parse ICC 'desc' or 'mluc' tag or fall back to readable name in header
	const readable = extractReadableStrings(
		iccBytes.subarray(0, Math.min(iccBytes.length, 4096)),
		4,
		10,
	);
	for (const str of readable) {
		if (
			/display\s*p3|srgb|adobe\s*rgb|prophoto|rec\.?\s*2020|apple\s*rgb|cmyk|icc/i.test(
				str,
			)
		) {
			return str;
		}
	}
	return null;
}

export function summarizeEntries(entries: MetadataEntry[]): {
	aiFlagCount: number;
	strippableCount: number;
} {
	let aiFlagCount = 0;
	let strippableCount = 0;
	for (const entry of entries) {
		if (entry.isAiFlag) aiFlagCount++;
		if (entry.category !== "icc") strippableCount++;
	}
	return { aiFlagCount, strippableCount };
}

export function categoryLabel(category: MetadataCategory): string {
	switch (category) {
		case "ai-provenance":
			return "AI / Provenance";
		case "exif":
			return "EXIF";
		case "xmp":
			return "XMP";
		case "iptc":
			return "IPTC";
		case "png-text":
			return "PNG Text";
		case "comment":
			return "Comment";
		case "timestamp":
			return "Timestamp";
		case "icc":
			return "ICC Color Profile";
		case "trailing":
			return "Trailing Bytes";
		default:
			return "Metadata";
	}
}
