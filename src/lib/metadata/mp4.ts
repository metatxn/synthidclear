import type {
	CleanResult,
	ImageFormat,
	MetadataEntry,
	ParseResult,
	StripScope,
} from "./types";
import {
	decodeUtf8,
	detectImageFormat,
	extractReadableStrings,
	formatToMime,
	hasAiSignal,
	mimeToExtension,
	parseXmpEntries,
	readAscii,
	sanitizeDisplayText,
	summarizeEntries,
} from "./utils";

interface TopLevelIsoBox {
	type: string;
	start: number;
	end: number;
	headerSize: number;
	dataStart: number;
	size: number;
}

interface InnerIsoBox {
	type: string;
	start: number;
	end: number;
	headerSize: number;
	dataStart: number;
	size: number;
}

const MAX_MOOV_BYTES = 64 * 1024 * 1024;
const MAX_META_BOX_INSPECT_BYTES = 16 * 1024 * 1024;
const MAX_TRAILING_INSPECT_BYTES = 64 * 1024;

// HFS+ (Mac/MP4 epoch 1904-01-01) to Unix epoch (1970-01-01) offset in seconds
const MP4_EPOCH_OFFSET_SEC = 2082844800;

const XMP_UUID = new Uint8Array([
	0xbe, 0x7a, 0xcf, 0xcb, 0x97, 0xa9, 0x42, 0xe8, 0x9c, 0x71, 0x99, 0x94, 0x91,
	0xe3, 0xaf, 0xac,
]);

const C2PA_UUID = new Uint8Array([
	0xd8, 0xfe, 0xc3, 0xd6, 0x1b, 0x0e, 0x48, 0x3c, 0x92, 0x97, 0x58, 0x28, 0x87,
	0x7e, 0xc4, 0x81,
]);

const ITUNES_TAG_LABELS: Record<string, string> = {
	"©nam": "Title",
	"©ART": "Artist",
	"©alb": "Album",
	"©too": "Encoder / Software",
	"©cmt": "Comment",
	"©day": "Creation Date",
	"©mak": "Device Make",
	"©mod": "Device Model",
	"©swr": "Software",
	"©xyz": "GPS Location (ISO 6709)",
	desc: "Description",
	ldes: "Long Description",
	cprt: "Copyright",
};

const KNOWN_META_CHILD_TYPES = new Set([
	"hdlr",
	"keys",
	"ilst",
	"free",
	"wide",
	"skip",
	"uuid",
	"xml ",
	"bxml",
	"pitm",
	"dinf",
	"iinf",
	"iloc",
	"iref",
	"iprp",
]);

function matchesUuid(
	bytes: Uint8Array,
	offset: number,
	target: Uint8Array,
): boolean {
	if (offset + 16 > bytes.length) return false;
	for (let i = 0; i < 16; i++) {
		if (bytes[offset + i] !== target[i]) return false;
	}
	return true;
}

async function readBlobRange(
	blob: Blob,
	start: number,
	end: number,
): Promise<Uint8Array> {
	const clampedStart = Math.max(0, start);
	const clampedEnd = Math.min(blob.size, Math.max(clampedStart, end));
	if (clampedEnd <= clampedStart) return new Uint8Array(0);
	const buf = await blob.slice(clampedStart, clampedEnd).arrayBuffer();
	return new Uint8Array(buf);
}

async function scanTopLevelBoxes(blob: Blob): Promise<{
	boxes: TopLevelIsoBox[];
	parsedEnd: number;
	isFragmented: boolean;
}> {
	const boxes: TopLevelIsoBox[] = [];
	let offset = 0;
	let isFragmented = false;

	while (offset + 8 <= blob.size) {
		const headerProbeLen = Math.min(16, blob.size - offset);
		const head = await readBlobRange(blob, offset, offset + headerProbeLen);
		if (head.length < 8) break;

		const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
		const size32 = view.getUint32(0, false);
		const type = readAscii(head, 4, 4);
		let headerSize = 8;
		let size = size32;

		if (size32 === 1) {
			if (head.length < 16) break;
			headerSize = 16;
			size = Number(view.getBigUint64(8, false));
		} else if (size32 === 0) {
			size = blob.size - offset;
		}

		if (
			!Number.isFinite(size) ||
			size < headerSize ||
			offset + size > blob.size
		) {
			break;
		}

		if (type === "moof") {
			isFragmented = true;
		}

		boxes.push({
			type,
			start: offset,
			end: offset + size,
			headerSize,
			dataStart: offset + headerSize,
			size,
		});
		offset += size;
	}

	return { boxes, parsedEnd: offset, isFragmented };
}

function readInnerBoxes(
	bytes: Uint8Array,
	start: number,
	end: number,
): InnerIsoBox[] {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const boxes: InnerIsoBox[] = [];
	let offset = start;

	while (offset + 8 <= end) {
		const size32 = view.getUint32(offset, false);
		const type = readAscii(bytes, offset + 4, 4);
		let headerSize = 8;
		let size = size32;

		if (size32 === 1) {
			if (offset + 16 > end) break;
			headerSize = 16;
			size = Number(view.getBigUint64(offset + 8, false));
		} else if (size32 === 0) {
			size = end - offset;
		}

		if (!Number.isFinite(size) || size < headerSize || offset + size > end) {
			break;
		}

		boxes.push({
			type,
			start: offset,
			end: offset + size,
			headerSize,
			dataStart: offset + headerSize,
			size,
		});
		offset += size;
	}

	return boxes;
}

function wrapBox(type: string, payload: Uint8Array): Uint8Array {
	const total = 8 + payload.byteLength;
	if (total <= 0xffffffff) {
		const out = new Uint8Array(total);
		const view = new DataView(out.buffer);
		view.setUint32(0, total, false);
		for (let i = 0; i < 4; i++) {
			out[4 + i] = type.charCodeAt(i) & 0xff;
		}
		out.set(payload, 8);
		return out;
	}
	const out = new Uint8Array(16 + payload.byteLength);
	const view = new DataView(out.buffer);
	view.setUint32(0, 1, false);
	for (let i = 0; i < 4; i++) {
		out[4 + i] = type.charCodeAt(i) & 0xff;
	}
	view.setBigUint64(8, BigInt(16 + payload.byteLength), false);
	out.set(payload, 16);
	return out;
}

function concatArrays(parts: Uint8Array[]): Uint8Array {
	const total = parts.reduce((sum, p) => sum + p.byteLength, 0);
	const out = new Uint8Array(total);
	let pos = 0;
	for (const part of parts) {
		out.set(part, pos);
		pos += part.byteLength;
	}
	return out;
}

function makeFreeBox(size: number): Uint8Array {
	const out = new Uint8Array(Math.max(8, size));
	const view = new DataView(out.buffer);
	view.setUint32(0, out.byteLength, false);
	out[4] = 0x66; // f
	out[5] = 0x72; // r
	out[6] = 0x65; // e
	out[7] = 0x65; // e
	return out;
}

function looksLikeMetaChildAt(
	bytes: Uint8Array,
	pos: number,
	end: number,
): boolean {
	if (pos + 8 > end) return false;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const sz = view.getUint32(pos, false);
	if (sz < 8 || pos + sz > end) return false;
	const fourcc = readAscii(bytes, pos + 4, 4);
	return KNOWN_META_CHILD_TYPES.has(fourcc);
}

function detectMetaChildrenStart(
	bytes: Uint8Array,
	box: { dataStart: number; end: number },
): number {
	// ISO 14496-12 FullBox 'meta' starts children at +4 (version + flags); classic QuickTime may start at +0
	if (looksLikeMetaChildAt(bytes, box.dataStart + 4, box.end)) {
		return box.dataStart + 4;
	}
	if (looksLikeMetaChildAt(bytes, box.dataStart, box.end)) {
		return box.dataStart;
	}
	return Math.min(box.end, box.dataStart + 4);
}

function decodeIlstDataValue(
	bytes: Uint8Array,
	dataBox: InnerIsoBox,
): string | null {
	if (dataBox.dataStart + 8 > dataBox.end) return null;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const typeIndicator = view.getUint32(dataBox.dataStart, false) & 0x00ffffff;
	const raw = bytes.subarray(dataBox.dataStart + 8, dataBox.end);
	if (raw.length === 0) return null;

	if (typeIndicator === 1) {
		return sanitizeDisplayText(decodeUtf8(raw));
	}
	if (typeIndicator === 2 && raw.length >= 2) {
		// UTF-16BE
		let str = "";
		for (let i = 0; i + 1 < raw.length; i += 2) {
			str += String.fromCharCode((raw[i] << 8) | raw[i + 1]);
		}
		return sanitizeDisplayText(str);
	}
	if (typeIndicator === 13 || typeIndicator === 14) {
		return `[Embedded cover artwork (${raw.length.toLocaleString()} bytes)]`;
	}
	if (typeIndicator === 21 || typeIndicator === 22) {
		if (raw.length === 1) return String(raw[0]);
		if (raw.length === 2)
			return String(view.getUint16(dataBox.dataStart + 8, false));
		if (raw.length === 4)
			return String(view.getUint32(dataBox.dataStart + 8, false));
	}
	const strings = extractReadableStrings(raw, 2, 6);
	return strings.length > 0
		? strings.join(" · ")
		: sanitizeDisplayText(decodeUtf8(raw));
}

function classifyTagCategory(
	key: string,
	value: string,
	source: string,
): MetadataEntry["category"] {
	if (hasAiSignal(key, value) || source.includes("C2PA")) {
		return "ai-provenance";
	}
	const lower = key.toLowerCase();
	if (lower.includes("xmp")) return "xmp";
	if (
		lower.includes("location") ||
		lower.includes("©xyz") ||
		lower.includes("gps") ||
		lower.includes("make") ||
		lower.includes("model") ||
		lower.includes("©mak") ||
		lower.includes("©mod")
	) {
		return "exif";
	}
	if (
		lower.includes("creation") ||
		lower.includes("©day") ||
		lower.includes("date")
	) {
		return "timestamp";
	}
	if (lower.includes("comment") || lower.includes("©cmt")) {
		return "comment";
	}
	return "other";
}

function parseKeysBox(bytes: Uint8Array, box: InnerIsoBox): string[] {
	const keys: string[] = [];
	if (box.dataStart + 8 > box.end) return keys;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const count = view.getUint32(box.dataStart + 4, false);
	let cursor = box.dataStart + 8;

	for (let i = 0; i < count && cursor + 8 <= box.end; i++) {
		const keySize = view.getUint32(cursor, false);
		if (keySize < 8 || cursor + keySize > box.end) break;
		const keyName = decodeUtf8(bytes.subarray(cursor + 8, cursor + keySize));
		keys.push(keyName);
		cursor += keySize;
	}
	return keys;
}

function parseMetaBoxEntries(
	bytes: Uint8Array,
	metaBox: InnerIsoBox,
	sourceLabel: string,
	idPrefix: string,
): MetadataEntry[] {
	const entries: MetadataEntry[] = [];
	const childrenStart = detectMetaChildrenStart(bytes, metaBox);
	const children = readInnerBoxes(bytes, childrenStart, metaBox.end);

	const keysBox = children.find((b) => b.type === "keys");
	const ilstBox = children.find((b) => b.type === "ilst");
	const keyTable = keysBox ? parseKeysBox(bytes, keysBox) : [];

	for (let ci = 0; ci < children.length; ci++) {
		const child = children[ci];
		if (child.type === "xml " && child.dataStart + 4 <= child.end) {
			const xmlText = decodeUtf8(
				bytes.subarray(child.dataStart + 4, child.end),
			);
			entries.push(
				...parseXmpEntries(
					xmlText,
					`${sourceLabel} (xml )`,
					child.size,
					`${idPrefix}-xml-${ci}`,
				),
			);
		} else if (child.type === "uuid" && child.dataStart + 16 <= child.end) {
			entries.push(
				...parseUuidPayload(
					bytes,
					child.dataStart,
					child.end,
					child.size,
					`${idPrefix}-uuid-${ci}`,
				),
			);
		}
	}

	if (ilstBox) {
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		const items = readInnerBoxes(bytes, ilstBox.dataStart, ilstBox.end);
		for (let ii = 0; ii < items.length; ii++) {
			const item = items[ii];
			const subBoxes = readInnerBoxes(bytes, item.dataStart, item.end);
			const dataBox = subBoxes.find((s) => s.type === "data");
			const itemKeyIndex = view.getUint32(item.start + 4, false);

			let keyLabel: string;
			if (
				keyTable.length > 0 &&
				itemKeyIndex >= 1 &&
				itemKeyIndex <= keyTable.length
			) {
				keyLabel = keyTable[itemKeyIndex - 1];
			} else if (item.type === "----") {
				const meanBox = subBoxes.find((s) => s.type === "mean");
				const nameBox = subBoxes.find((s) => s.type === "name");
				const meanStr =
					meanBox && meanBox.dataStart + 4 <= meanBox.end
						? decodeUtf8(bytes.subarray(meanBox.dataStart + 4, meanBox.end))
						: "";
				const nameStr =
					nameBox && nameBox.dataStart + 4 <= nameBox.end
						? decodeUtf8(bytes.subarray(nameBox.dataStart + 4, nameBox.end))
						: "";
				keyLabel =
					[meanStr, nameStr].filter(Boolean).join(":") || "Freeform Tag (----)";
			} else {
				const friendly = ITUNES_TAG_LABELS[item.type];
				keyLabel = friendly ? `${friendly} (${item.type})` : item.type;
			}

			let val = dataBox ? decodeIlstDataValue(bytes, dataBox) : null;
			if (!val) {
				const strings = extractReadableStrings(
					bytes.subarray(item.dataStart, item.end),
					2,
					6,
				);
				val = strings.join(" · ");
			}
			if (!val) continue;

			const cat = classifyTagCategory(keyLabel, val, sourceLabel);
			entries.push({
				id: `${idPrefix}-ilst-${ii}`,
				key: keyLabel,
				value: val,
				category: cat,
				source: sourceLabel,
				byteSize: item.size,
				isAiFlag: cat === "ai-provenance" || hasAiSignal(keyLabel, val),
			});
		}
	}

	if (entries.length === 0 && metaBox.size > 16) {
		const strings = extractReadableStrings(
			bytes.subarray(metaBox.dataStart, metaBox.end),
			4,
			8,
		);
		if (strings.length > 0) {
			const joined = strings.join(" · ");
			const ai = hasAiSignal("meta", joined);
			entries.push({
				id: `${idPrefix}-meta-raw`,
				key: `Container Metadata (${metaBox.type})`,
				value: joined,
				category: ai ? "ai-provenance" : "other",
				source: sourceLabel,
				byteSize: metaBox.size,
				isAiFlag: ai,
			});
		}
	}

	return entries;
}

function decodeUdtaTextPayload(bytes: Uint8Array, box: InnerIsoBox): string {
	const raw = bytes.subarray(box.dataStart, box.end);
	if (raw.length >= 4) {
		const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
		const textLen = view.getUint16(0, false);
		if (textLen > 0 && 4 + textLen <= raw.length) {
			return sanitizeDisplayText(decodeUtf8(raw.subarray(4, 4 + textLen)));
		}
	}
	const strings = extractReadableStrings(raw, 2, 6);
	return strings.join(" · ") || sanitizeDisplayText(decodeUtf8(raw));
}

function parseUdtaBoxEntries(
	bytes: Uint8Array,
	udtaBox: InnerIsoBox,
	sourceLabel: string,
	idPrefix: string,
): MetadataEntry[] {
	const entries: MetadataEntry[] = [];
	const children = readInnerBoxes(bytes, udtaBox.dataStart, udtaBox.end);

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (child.type === "meta") {
			entries.push(
				...parseMetaBoxEntries(
					bytes,
					child,
					`${sourceLabel}/meta`,
					`${idPrefix}-m-${i}`,
				),
			);
		} else if (child.type === "uuid" && child.dataStart + 16 <= child.end) {
			entries.push(
				...parseUuidPayload(
					bytes,
					child.dataStart,
					child.end,
					child.size,
					`${idPrefix}-u-${i}`,
				),
			);
		} else if (child.type === "jumb" || child.type === "c2pa") {
			entries.push(
				buildC2paEntry(
					bytes.subarray(child.dataStart, child.end),
					child.type,
					`${sourceLabel}/${child.type}`,
					child.size,
					`${idPrefix}-c2pa-${i}`,
				),
			);
		} else if (child.type === "XMP_") {
			entries.push(
				...parseXmpEntries(
					decodeUtf8(bytes.subarray(child.dataStart, child.end)),
					`${sourceLabel} (XMP_)`,
					child.size,
					`${idPrefix}-xmp-${i}`,
				),
			);
		} else if (
			child.type.startsWith("©") ||
			child.type === "loci" ||
			child.type === "cprt" ||
			child.type === "auth" ||
			child.type === "titl" ||
			child.type === "dscp"
		) {
			const val = decodeUdtaTextPayload(bytes, child);
			if (!val) continue;
			const friendly = ITUNES_TAG_LABELS[child.type];
			const keyLabel = friendly
				? `${friendly} (${child.type})`
				: `User Data (${child.type})`;
			const cat = classifyTagCategory(keyLabel, val, sourceLabel);
			entries.push({
				id: `${idPrefix}-atom-${i}`,
				key: keyLabel,
				value: val,
				category: cat,
				source: sourceLabel,
				byteSize: child.size,
				isAiFlag: cat === "ai-provenance" || hasAiSignal(keyLabel, val),
			});
		} else if (child.size > 8) {
			const strings = extractReadableStrings(
				bytes.subarray(child.dataStart, child.end),
				4,
				6,
			);
			if (strings.length > 0) {
				const joined = strings.join(" · ");
				const ai = hasAiSignal(child.type, joined);
				entries.push({
					id: `${idPrefix}-other-${i}`,
					key: `User Data Atom (${child.type})`,
					value: joined,
					category: ai ? "ai-provenance" : "other",
					source: sourceLabel,
					byteSize: child.size,
					isAiFlag: ai,
				});
			}
		}
	}

	return entries;
}

function buildC2paEntry(
	payload: Uint8Array,
	label: string,
	source: string,
	byteSize: number,
	id: string,
): MetadataEntry {
	const strings = extractReadableStrings(payload, 4, 10);
	return {
		id,
		key: `${label} (C2PA / JUMBF Content Credentials)`,
		value:
			strings.length > 0
				? strings.join(" · ")
				: `Binary C2PA / JUMBF box (${byteSize.toLocaleString()} bytes)`,
		category: "ai-provenance",
		source,
		byteSize,
		isAiFlag: true,
	};
}

function parseUuidPayload(
	bytes: Uint8Array,
	dataStart: number,
	end: number,
	boxSize: number,
	idPrefix: string,
): MetadataEntry[] {
	if (dataStart + 16 > end) return [];
	const payload = bytes.subarray(dataStart + 16, end);

	if (matchesUuid(bytes, dataStart, XMP_UUID)) {
		return parseXmpEntries(
			decodeUtf8(payload),
			"uuid (XMP)",
			boxSize,
			idPrefix,
		);
	}
	if (matchesUuid(bytes, dataStart, C2PA_UUID)) {
		return [
			buildC2paEntry(
				payload,
				"uuid",
				"C2PA (uuid)",
				boxSize,
				`${idPrefix}-c2pa-uuid`,
			),
		];
	}

	const strings = extractReadableStrings(payload, 4, 6);
	if (strings.length === 0) return [];
	const summary = strings.join(" · ");
	const ai = hasAiSignal("uuid", summary);
	return [
		{
			id: `${idPrefix}-uuid`,
			key: "UUID Extension Box",
			value: summary,
			category: ai ? "ai-provenance" : "other",
			source: "uuid",
			byteSize: boxSize,
			isAiFlag: ai,
		},
	];
}

function readHeaderCreationTimeSec(
	bytes: Uint8Array,
	box: InnerIsoBox,
): number {
	const d = box.dataStart;
	if (d + 4 > box.end) return 0;
	const version = bytes[d];
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (version === 0 && d + 12 <= box.end) {
		return Math.max(view.getUint32(d + 4, false), view.getUint32(d + 8, false));
	}
	if (version === 1 && d + 20 <= box.end) {
		return Math.max(
			Number(view.getBigUint64(d + 4, false)),
			Number(view.getBigUint64(d + 12, false)),
		);
	}
	return 0;
}

function zeroHeaderTimestamps(bytes: Uint8Array, box: InnerIsoBox): boolean {
	const d = box.dataStart;
	if (d + 4 > box.end) return false;
	const version = bytes[d];
	if (version === 0 && d + 12 <= box.end) {
		let hadNonZero = false;
		for (let i = d + 4; i < d + 12; i++) {
			if (bytes[i] !== 0) hadNonZero = true;
			bytes[i] = 0;
		}
		return hadNonZero;
	}
	if (version === 1 && d + 20 <= box.end) {
		let hadNonZero = false;
		for (let i = d + 4; i < d + 20; i++) {
			if (bytes[i] !== 0) hadNonZero = true;
			bytes[i] = 0;
		}
		return hadNonZero;
	}
	return false;
}

function formatMp4Timestamp(secSince1904: number): string {
	const unixMs = (secSince1904 - MP4_EPOCH_OFFSET_SEC) * 1000;
	if (!Number.isFinite(unixMs) || unixMs <= 0) {
		return `Timestamp present (${secSince1904.toLocaleString()}s)`;
	}
	const iso = new Date(unixMs).toISOString();
	return `${iso.slice(0, 19).replace("T", " ")} UTC`;
}

function parseTkhdDimensions(
	bytes: Uint8Array,
	tkhdBox: InnerIsoBox,
): { w: number; h: number } | null {
	const d = tkhdBox.dataStart;
	if (d + 4 > tkhdBox.end) return null;
	const version = bytes[d];
	const widthOffset = version === 1 ? d + 88 : d + 76;
	const heightOffset = version === 1 ? d + 92 : d + 80;
	if (heightOffset + 4 > tkhdBox.end) return null;

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const w = view.getUint16(widthOffset, false);
	const h = view.getUint16(heightOffset, false);
	if (w > 0 && h > 0) return { w, h };
	return null;
}

function parseMoovBytes(
	bytes: Uint8Array,
	moovBox: InnerIsoBox,
): {
	width: number | null;
	height: number | null;
	entries: MetadataEntry[];
} {
	const entries: MetadataEntry[] = [];
	let width: number | null = null;
	let height: number | null = null;
	let latestTimestampSec = 0;
	let timestampBoxesCount = 0;

	const moovChildren = readInnerBoxes(bytes, moovBox.dataStart, moovBox.end);

	for (let i = 0; i < moovChildren.length; i++) {
		const child = moovChildren[i];
		if (child.type === "mvhd") {
			const ts = readHeaderCreationTimeSec(bytes, child);
			if (ts > 0) {
				timestampBoxesCount++;
				latestTimestampSec = Math.max(latestTimestampSec, ts);
			}
		} else if (child.type === "udta") {
			entries.push(
				...parseUdtaBoxEntries(bytes, child, "moov/udta", `moov-udta-${i}`),
			);
		} else if (child.type === "meta") {
			entries.push(
				...parseMetaBoxEntries(bytes, child, "moov/meta", `moov-meta-${i}`),
			);
		} else if (child.type === "uuid") {
			entries.push(
				...parseUuidPayload(
					bytes,
					child.dataStart,
					child.end,
					child.size,
					`moov-u-${i}`,
				),
			);
		} else if (child.type === "jumb" || child.type === "c2pa") {
			entries.push(
				buildC2paEntry(
					bytes.subarray(child.dataStart, child.end),
					child.type,
					`moov/${child.type}`,
					child.size,
					`moov-c2pa-${i}`,
				),
			);
		} else if (child.type === "trak") {
			const trakChildren = readInnerBoxes(bytes, child.dataStart, child.end);
			for (let ti = 0; ti < trakChildren.length; ti++) {
				const tc = trakChildren[ti];
				if (tc.type === "tkhd") {
					const dims = parseTkhdDimensions(bytes, tc);
					if (
						dims &&
						(width === null ||
							height === null ||
							dims.w * dims.h > width * height)
					) {
						width = dims.w;
						height = dims.h;
					}
					const ts = readHeaderCreationTimeSec(bytes, tc);
					if (ts > 0) {
						timestampBoxesCount++;
						latestTimestampSec = Math.max(latestTimestampSec, ts);
					}
				} else if (tc.type === "udta") {
					entries.push(
						...parseUdtaBoxEntries(
							bytes,
							tc,
							`trak[${i}]/udta`,
							`trak-${i}-udta-${ti}`,
						),
					);
				} else if (tc.type === "meta") {
					entries.push(
						...parseMetaBoxEntries(
							bytes,
							tc,
							`trak[${i}]/meta`,
							`trak-${i}-meta-${ti}`,
						),
					);
				} else if (tc.type === "uuid") {
					entries.push(
						...parseUuidPayload(
							bytes,
							tc.dataStart,
							tc.end,
							tc.size,
							`trak-${i}-u-${ti}`,
						),
					);
				} else if (tc.type === "jumb" || tc.type === "c2pa") {
					entries.push(
						buildC2paEntry(
							bytes.subarray(tc.dataStart, tc.end),
							tc.type,
							`trak[${i}]/${tc.type}`,
							tc.size,
							`trak-${i}-c2pa-${ti}`,
						),
					);
				} else if (tc.type === "mdia") {
					const mdiaChildren = readInnerBoxes(bytes, tc.dataStart, tc.end);
					for (const mc of mdiaChildren) {
						if (mc.type === "mdhd") {
							const ts = readHeaderCreationTimeSec(bytes, mc);
							if (ts > 0) {
								timestampBoxesCount++;
								latestTimestampSec = Math.max(latestTimestampSec, ts);
							}
						}
					}
				}
			}
		}
	}

	if (latestTimestampSec > 0) {
		entries.push({
			id: "moov-timestamps",
			key: "Container Creation / Modification Timestamps",
			value: `${formatMp4Timestamp(latestTimestampSec)} (across ${timestampBoxesCount} header ${timestampBoxesCount === 1 ? "box" : "boxes"})`,
			category: "timestamp",
			source: "mvhd / tkhd / mdhd",
			byteSize: 8 * timestampBoxesCount,
			isAiFlag: false,
		});
	}

	return { width, height, entries };
}

/**
 * Parses MP4 or MOV container metadata using File.slice() headers and reading ONLY `moov`
 * and metadata boxes into memory (zero `mdat` video payload reads).
 */
export async function parseMp4Metadata(blob: Blob): Promise<ParseResult> {
	const ftypHead = await readBlobRange(blob, 0, Math.min(64, blob.size));
	const format: ImageFormat = detectImageFormat(ftypHead);
	const mimeType = formatToMime(format);
	const entries: MetadataEntry[] = [];
	const parseWarnings: string[] = [];
	let width: number | null = null;
	let height: number | null = null;

	const {
		boxes: topBoxes,
		parsedEnd,
		isFragmented,
	} = await scanTopLevelBoxes(blob);

	if (isFragmented) {
		parseWarnings.push(
			"Fragmented MP4 detected — metadata boxes are replaced with empty padding to keep stream offsets intact.",
		);
	}

	for (let bi = 0; bi < topBoxes.length; bi++) {
		const box = topBoxes[bi];
		if (box.type === "moov") {
			if (box.size > MAX_MOOV_BYTES) {
				parseWarnings.push(
					`Movie header box (moov) exceeds ${(MAX_MOOV_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
				);
				continue;
			}
			const moovBytes = await readBlobRange(blob, box.start, box.end);
			const parsedMoov = parseMoovBytes(moovBytes, {
				type: "moov",
				start: 0,
				end: moovBytes.length,
				headerSize: box.headerSize,
				dataStart: box.headerSize,
				size: moovBytes.length,
			});
			width = parsedMoov.width;
			height = parsedMoov.height;
			entries.push(...parsedMoov.entries);
		} else if (
			box.type === "uuid" ||
			box.type === "jumb" ||
			box.type === "c2pa" ||
			box.type === "udta" ||
			box.type === "meta"
		) {
			const inspectEnd = Math.min(
				box.end,
				box.start + MAX_META_BOX_INSPECT_BYTES,
			);
			const boxBytes = await readBlobRange(blob, box.start, inspectEnd);
			const innerBox: InnerIsoBox = {
				type: box.type,
				start: 0,
				end: boxBytes.length,
				headerSize: box.headerSize,
				dataStart: box.headerSize,
				size: boxBytes.length,
			};
			if (box.type === "uuid") {
				entries.push(
					...parseUuidPayload(
						boxBytes,
						innerBox.dataStart,
						innerBox.end,
						box.size,
						`top-${bi}`,
					),
				);
			} else if (box.type === "jumb" || box.type === "c2pa") {
				entries.push(
					buildC2paEntry(
						boxBytes.subarray(innerBox.dataStart),
						box.type,
						box.type,
						box.size,
						`top-${bi}-${box.type}`,
					),
				);
			} else if (box.type === "udta") {
				entries.push(
					...parseUdtaBoxEntries(
						boxBytes,
						innerBox,
						"top/udta",
						`top-${bi}-udta`,
					),
				);
			} else if (box.type === "meta") {
				entries.push(
					...parseMetaBoxEntries(
						boxBytes,
						innerBox,
						"top/meta",
						`top-${bi}-meta`,
					),
				);
			}
		}
	}

	if (parsedEnd < blob.size) {
		const trailingSize = blob.size - parsedEnd;
		const trailingHead = await readBlobRange(
			blob,
			parsedEnd,
			Math.min(blob.size, parsedEnd + MAX_TRAILING_INSPECT_BYTES),
		);
		const strings = extractReadableStrings(trailingHead, 4, 6);
		const summary =
			strings.length > 0
				? `${trailingSize.toLocaleString()} bytes after container (${strings.join(" · ")})`
				: `${trailingSize.toLocaleString()} trailing bytes after container`;
		const aiFlag = hasAiSignal("trailing", summary);
		entries.push({
			id: "mp4-trailing",
			key: "Trailing Bytes After Container",
			value: summary,
			category: aiFlag ? "ai-provenance" : "trailing",
			source: "Post-MP4",
			byteSize: trailingSize,
			isAiFlag: aiFlag,
		});
	}

	const { aiFlagCount, strippableCount } = summarizeEntries(entries);
	return {
		format,
		mimeType,
		width,
		height,
		byteLength: blob.size,
		hasIccProfile: false,
		iccProfileName: null,
		entries,
		aiFlagCount,
		strippableCount,
		parseWarnings,
	};
}

function shouldStripSubBox(
	bytes: Uint8Array,
	box: InnerIsoBox,
	stripScope: StripScope,
): boolean {
	if (box.type === "jumb" || box.type === "c2pa") {
		return true;
	}
	if (box.type === "uuid" && box.dataStart + 16 <= box.end) {
		if (matchesUuid(bytes, box.dataStart, C2PA_UUID)) return true;
		if (matchesUuid(bytes, box.dataStart, XMP_UUID)) {
			if (stripScope === "all") return true;
			const xmlText = decodeUtf8(bytes.subarray(box.dataStart + 16, box.end));
			return parseXmpEntries(xmlText, "uuid (XMP)", box.size, "chk").some(
				(e) => e.isAiFlag,
			);
		}
		if (stripScope === "all") {
			return true;
		}
		const strings = extractReadableStrings(
			bytes.subarray(box.dataStart + 16, box.end),
			4,
			8,
		);
		return hasAiSignal("uuid", strings.join(" "));
	}
	if (box.type === "udta") {
		if (stripScope === "all") return true;
		return parseUdtaBoxEntries(bytes, box, "udta", "chk").some(
			(e) => e.isAiFlag,
		);
	}
	if (box.type === "meta") {
		if (stripScope === "all") return true;
		return parseMetaBoxEntries(bytes, box, "meta", "chk").some(
			(e) => e.isAiFlag,
		);
	}
	return false;
}

function patchChunkOffsetsInMoov(
	moovBytes: Uint8Array,
	shiftLookup: (absOffset: number) => number,
): void {
	const view = new DataView(
		moovBytes.buffer,
		moovBytes.byteOffset,
		moovBytes.byteLength,
	);

	function walk(start: number, end: number): void {
		const children = readInnerBoxes(moovBytes, start, end);
		for (const child of children) {
			if (
				child.type === "moov" ||
				child.type === "trak" ||
				child.type === "mdia" ||
				child.type === "minf" ||
				child.type === "stbl"
			) {
				walk(child.dataStart, child.end);
			} else if (child.type === "stco" && child.dataStart + 8 <= child.end) {
				const entryCount = view.getUint32(child.dataStart + 4, false);
				let cursor = child.dataStart + 8;
				for (let i = 0; i < entryCount && cursor + 4 <= child.end; i++) {
					const orig = view.getUint32(cursor, false);
					const shifted = Math.max(0, orig + shiftLookup(orig));
					view.setUint32(cursor, shifted >>> 0, false);
					cursor += 4;
				}
			} else if (child.type === "co64" && child.dataStart + 8 <= child.end) {
				const entryCount = view.getUint32(child.dataStart + 4, false);
				let cursor = child.dataStart + 8;
				for (let i = 0; i < entryCount && cursor + 8 <= child.end; i++) {
					const orig = view.getBigUint64(cursor, false);
					const delta = shiftLookup(Number(orig));
					const next = orig + BigInt(delta);
					view.setBigUint64(cursor, next < 0n ? 0n : next, false);
					cursor += 8;
				}
			}
		}
	}

	walk(0, moovBytes.length);
}

function rebuildMoovTree(
	origMoovBytes: Uint8Array,
	stripScope: StripScope,
	removedSegments: string[],
): Uint8Array {
	const top = readInnerBoxes(origMoovBytes, 0, origMoovBytes.length)[0];
	if (!top) return origMoovBytes;

	function rebuildContainer(box: InnerIsoBox, pathPrefix: string): Uint8Array {
		const children = readInnerBoxes(origMoovBytes, box.dataStart, box.end);
		const keptParts: Uint8Array[] = [];

		for (const child of children) {
			if (shouldStripSubBox(origMoovBytes, child, stripScope)) {
				removedSegments.push(`${pathPrefix}/${child.type}`);
				continue;
			}

			if (
				child.type === "trak" ||
				child.type === "mdia" ||
				child.type === "minf" ||
				child.type === "stbl"
			) {
				keptParts.push(rebuildContainer(child, `${pathPrefix}/${child.type}`));
			} else if (
				stripScope === "all" &&
				(child.type === "mvhd" ||
					child.type === "tkhd" ||
					child.type === "mdhd")
			) {
				const copy = new Uint8Array(
					origMoovBytes.subarray(child.start, child.end),
				);
				if (
					zeroHeaderTimestamps(copy, {
						type: child.type,
						start: 0,
						end: copy.length,
						headerSize: child.headerSize,
						dataStart: child.headerSize,
						size: copy.length,
					})
				) {
					removedSegments.push(`${child.type}(timestamps)`);
				}
				keptParts.push(copy);
			} else {
				keptParts.push(origMoovBytes.subarray(child.start, child.end));
			}
		}

		return wrapBox(box.type, concatArrays(keptParts));
	}

	return rebuildContainer(top, "moov");
}

/**
 * Losslessly strips MP4 / MOV metadata using File.slice() so video/audio payloads (`mdat`)
 * are never loaded into JS RAM. Rewrites `stco` / `co64` chunk offset tables accurately.
 */
export async function stripMp4Lossless(
	blob: Blob,
	stripScope: StripScope = "all",
): Promise<CleanResult> {
	const ftypHead = await readBlobRange(blob, 0, Math.min(64, blob.size));
	const format = detectImageFormat(ftypHead);
	if (format !== "mp4" && format !== "mov") {
		throw new Error("Unsupported video container. Use MP4 or MOV.");
	}
	const outputMimeType = formatToMime(format);
	const outputExtension = mimeToExtension(outputMimeType);

	const {
		boxes: topBoxes,
		parsedEnd,
		isFragmented,
	} = await scanTopLevelBoxes(blob);
	const removedSegments: string[] = [];

	interface OutputPartPlan {
		kind: "slice" | "bytes";
		oldStart: number;
		oldEnd: number;
		newStart: number;
		bytes?: Uint8Array;
		isMoov?: boolean;
	}

	const plan: OutputPartPlan[] = [];
	let writeCursor = 0;

	for (const box of topBoxes) {
		if (box.type === "moov") {
			if (box.size > MAX_MOOV_BYTES) {
				throw new Error(
					"Video moov header exceeds browser memory limit. Use the local FFmpeg CLI command below.",
				);
			}
			const moovBytes = await readBlobRange(blob, box.start, box.end);
			let rebuiltMoov = rebuildMoovTree(moovBytes, stripScope, removedSegments);

			// For fragmented MP4, preserve exact byte offsets before moof/mdat using internal free padding
			if (isFragmented && rebuiltMoov.byteLength !== box.size) {
				const diff = box.size - rebuiltMoov.byteLength;
				if (diff >= 8) {
					const topInner = readInnerBoxes(
						rebuiltMoov,
						0,
						rebuiltMoov.length,
					)[0];
					if (topInner) {
						const payloadWithoutHeader = rebuiltMoov.subarray(
							topInner.dataStart,
							topInner.end,
						);
						rebuiltMoov = wrapBox(
							"moov",
							concatArrays([payloadWithoutHeader, makeFreeBox(diff)]),
						);
					}
				} else {
					rebuiltMoov = moovBytes;
				}
			}

			plan.push({
				kind: "bytes",
				oldStart: box.start,
				oldEnd: box.end,
				newStart: writeCursor,
				bytes: rebuiltMoov,
				isMoov: true,
			});
			writeCursor += rebuiltMoov.byteLength;
			continue;
		}

		let dropTopBox = false;
		if (
			box.type === "jumb" ||
			box.type === "c2pa" ||
			box.type === "uuid" ||
			box.type === "udta" ||
			box.type === "meta"
		) {
			const inspectEnd = Math.min(
				box.end,
				box.start + MAX_META_BOX_INSPECT_BYTES,
			);
			const rawBox = await readBlobRange(blob, box.start, inspectEnd);
			const inner: InnerIsoBox = {
				type: box.type,
				start: 0,
				end: rawBox.length,
				headerSize: box.headerSize,
				dataStart: box.headerSize,
				size: rawBox.length,
			};
			if (shouldStripSubBox(rawBox, inner, stripScope)) {
				dropTopBox = true;
				removedSegments.push(box.type);
			}
		}

		if (dropTopBox) {
			if (isFragmented) {
				// Replace with same-size zeroed 'free' box so subsequent moof offsets stay valid
				const pad = makeFreeBox(box.size);
				plan.push({
					kind: "bytes",
					oldStart: box.start,
					oldEnd: box.end,
					newStart: writeCursor,
					bytes: pad,
				});
				writeCursor += pad.byteLength;
			}
			continue;
		}

		plan.push({
			kind: "slice",
			oldStart: box.start,
			oldEnd: box.end,
			newStart: writeCursor,
		});
		writeCursor += box.size;
	}

	if (parsedEnd < blob.size) {
		const trailingSize = blob.size - parsedEnd;
		const trailingHead = await readBlobRange(
			blob,
			parsedEnd,
			Math.min(blob.size, parsedEnd + MAX_TRAILING_INSPECT_BYTES),
		);
		const strings = extractReadableStrings(trailingHead, 4, 6);
		if (stripScope === "all" || hasAiSignal("trailing", strings.join(" "))) {
			removedSegments.push(`Trailing(${trailingSize}B)`);
		} else {
			plan.push({
				kind: "slice",
				oldStart: parsedEnd,
				oldEnd: blob.size,
				newStart: writeCursor,
			});
			writeCursor += trailingSize;
		}
	}

	// Pass 2: Update all stco / co64 chunk offsets inside moov using top-level byte deltas
	const shiftLookup = (absOffset: number): number => {
		for (const item of plan) {
			if (absOffset >= item.oldStart && absOffset < item.oldEnd) {
				return item.newStart - item.oldStart;
			}
		}
		return 0;
	};

	for (const item of plan) {
		if (item.isMoov && item.bytes) {
			patchChunkOffsetsInMoov(item.bytes, shiftLookup);
		}
	}

	// Assemble output Blob strictly from small rewritten metadata Uint8Arrays + zero-copy File.slice() ranges
	const blobParts: BlobPart[] = [];
	for (const item of plan) {
		if (item.kind === "bytes" && item.bytes) {
			const copy = new Uint8Array(item.bytes.byteLength);
			copy.set(item.bytes);
			blobParts.push(copy.buffer);
		} else {
			blobParts.push(blob.slice(item.oldStart, item.oldEnd));
		}
	}

	const cleanedBlob = new Blob(blobParts, { type: outputMimeType });
	const verification = await parseMp4Metadata(cleanedBlob);

	return {
		cleanedBuffer: null,
		cleanedBlob,
		outputMimeType,
		outputExtension,
		modeUsed: "lossless",
		stripScope,
		originalSize: blob.size,
		cleanedSize: cleanedBlob.size,
		iccPreserved: false,
		removedSegments,
		verification,
	};
}
