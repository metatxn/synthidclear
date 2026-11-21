import type {
	MetadataEntry,
	ParseResult,
	StripResult,
	StripScope,
} from "./types";
import {
	decodeUtf8,
	extractIccProfileName,
	extractReadableStrings,
	hasAiSignal,
	parseExifEntries,
	parseXmpEntries,
	readAscii,
	summarizeEntries,
} from "./utils";

const WEBP_PRESERVE_CHUNKS = new Set([
	"VP8 ",
	"VP8L",
	"ALPH",
	"ANIM",
	"ANMF",
	"VP8X",
]);

function readUint24LE(bytes: Uint8Array, offset: number): number {
	return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

export function parseWebpMetadata(bytes: Uint8Array): ParseResult {
	const entries: MetadataEntry[] = [];
	const parseWarnings: string[] = [];
	let width: number | null = null;
	let height: number | null = null;
	let hasIccProfile = false;
	let iccProfileName: string | null = null;

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const riffSize = view.getUint32(4, true);
	const riffEnd = Math.min(bytes.length, 8 + riffSize);

	let offset = 12; // skip RIFF + size + WEBP
	let chunkIndex = 0;

	while (offset + 8 <= riffEnd) {
		const fourcc = readAscii(bytes, offset, 4);
		const chunkSize = view.getUint32(offset + 4, true);
		const dataStart = offset + 8;
		const dataEnd = dataStart + chunkSize;
		const paddedEnd = dataEnd + (chunkSize % 2);

		if (dataEnd > bytes.length) {
			parseWarnings.push(`Truncated WebP chunk "${fourcc}" at byte ${offset}.`);
			break;
		}

		const data = bytes.subarray(dataStart, dataEnd);
		const totalChunkBytes = 8 + chunkSize + (chunkSize % 2);
		const idPrefix = `webp-${chunkIndex}`;

		if (fourcc === "VP8X" && chunkSize >= 10) {
			width = readUint24LE(data, 4) + 1;
			height = readUint24LE(data, 7) + 1;
		} else if (fourcc === "VP8 " && width === null && chunkSize >= 10) {
			if (data[3] === 0x9d && data[4] === 0x01 && data[5] === 0x2a) {
				width = (data[6] | (data[7] << 8)) & 0x3fff;
				height = (data[8] | (data[9] << 8)) & 0x3fff;
			}
		} else if (fourcc === "VP8L" && width === null && chunkSize >= 5) {
			if (data[0] === 0x2f) {
				const bits =
					data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24);
				width = (bits & 0x3fff) + 1;
				height = ((bits >>> 14) & 0x3fff) + 1;
			}
		} else if (fourcc === "ICCP") {
			hasIccProfile = true;
			iccProfileName = extractIccProfileName(data);
			entries.push({
				id: `${idPrefix}-iccp`,
				key: `ICC Profile: ${iccProfileName ?? "Embedded Color Profile"}`,
				value: `Color profile (${chunkSize.toLocaleString()} bytes) — preserved by default in Lossless mode`,
				category: "icc",
				source: "ICCP",
				byteSize: totalChunkBytes,
				isAiFlag: false,
				isPreservedByDefault: true,
			});
		} else if (fourcc === "EXIF") {
			entries.push(...parseExifEntries(data, "EXIF", idPrefix));
		} else if (fourcc === "XMP ") {
			const xml = decodeUtf8(data);
			entries.push(...parseXmpEntries(xml, "XMP ", totalChunkBytes, idPrefix));
		} else if (
			fourcc === "C2PA" ||
			fourcc === "JUMB" ||
			fourcc === "jumb" ||
			fourcc === "c2pa"
		) {
			const strings = extractReadableStrings(data, 4, 10);
			entries.push({
				id: `${idPrefix}-c2pa`,
				key: `${fourcc} (C2PA / JUMBF Content Credentials)`,
				value:
					strings.length > 0
						? strings.join(" · ")
						: `Binary C2PA / JUMBF payload (${chunkSize.toLocaleString()} bytes)`,
				category: "ai-provenance",
				source: fourcc,
				byteSize: totalChunkBytes,
				isAiFlag: true,
			});
		} else if (!WEBP_PRESERVE_CHUNKS.has(fourcc)) {
			const strings = extractReadableStrings(data, 4, 6);
			const summary =
				strings.length > 0
					? strings.join(" · ")
					: `Unknown RIFF chunk (${chunkSize.toLocaleString()} bytes)`;
			const aiFlag = hasAiSignal(fourcc, summary);
			entries.push({
				id: `${idPrefix}-other`,
				key: `RIFF Chunk: ${fourcc}`,
				value: summary,
				category: aiFlag ? "ai-provenance" : "other",
				source: fourcc,
				byteSize: totalChunkBytes,
				isAiFlag: aiFlag,
			});
		}

		offset = paddedEnd;
		chunkIndex++;
	}

	if (riffEnd < bytes.length) {
		const trailingSize = bytes.length - riffEnd;
		const trailingBytes = bytes.subarray(riffEnd);
		const strings = extractReadableStrings(trailingBytes, 4, 6);
		const summary =
			strings.length > 0
				? `${trailingSize.toLocaleString()} bytes after RIFF (${strings.join(" · ")})`
				: `${trailingSize.toLocaleString()} trailing bytes after RIFF container`;
		const aiFlag = hasAiSignal("trailing", summary);
		entries.push({
			id: "webp-trailing",
			key: "Trailing Bytes After RIFF",
			value: summary,
			category: aiFlag ? "ai-provenance" : "trailing",
			source: "Post-RIFF",
			byteSize: trailingSize,
			isAiFlag: aiFlag,
		});
	}

	const { aiFlagCount, strippableCount } = summarizeEntries(entries);
	return {
		format: "webp",
		mimeType: "image/webp",
		width,
		height,
		byteLength: bytes.byteLength,
		hasIccProfile,
		iccProfileName,
		entries,
		aiFlagCount,
		strippableCount,
		parseWarnings,
	};
}

export function stripWebpLossless(
	bytes: Uint8Array,
	preserveIcc: boolean,
	stripScope: StripScope = "all",
): StripResult {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const riffSize = view.getUint32(4, true);
	const riffEnd = Math.min(bytes.length, 8 + riffSize);

	interface RawChunk {
		fourcc: string;
		bytes: Uint8Array;
	}

	const keptChunks: RawChunk[] = [];
	const removedSegments: string[] = [];
	let iccPreserved = false;
	let keptExif = false;
	let keptXmp = false;
	let hasAlphaOrAnim = false;

	let offset = 12;
	while (offset + 8 <= riffEnd) {
		const fourcc = readAscii(bytes, offset, 4);
		const chunkSize = view.getUint32(offset + 4, true);
		const dataStart = offset + 8;
		const dataEnd = dataStart + chunkSize;
		const paddedEnd = Math.min(bytes.length, dataEnd + (chunkSize % 2));

		if (dataEnd > bytes.length) break;

		let keep =
			WEBP_PRESERVE_CHUNKS.has(fourcc) || (fourcc === "ICCP" && preserveIcc);

		if (!keep && stripScope === "ai-only") {
			const data = bytes.subarray(dataStart, dataEnd);
			if (
				fourcc === "C2PA" ||
				fourcc === "JUMB" ||
				fourcc === "jumb" ||
				fourcc === "c2pa"
			) {
				keep = false;
			} else if (fourcc === "EXIF") {
				keep = !parseExifEntries(data, "EXIF", "chk").some((e) => e.isAiFlag);
			} else if (fourcc === "XMP ") {
				keep = !hasAiSignal("XMP", decodeUtf8(data));
			} else {
				const strings = extractReadableStrings(data, 4, 6);
				keep = !hasAiSignal(fourcc, strings.join(" "));
			}
		}

		if (keep) {
			if (fourcc === "ICCP") iccPreserved = true;
			if (fourcc === "EXIF") keptExif = true;
			if (fourcc === "XMP ") keptXmp = true;
			if (fourcc === "ALPH" || fourcc === "ANIM" || fourcc === "ANMF") {
				hasAlphaOrAnim = true;
			}
			// Ensure even-byte padding in the copied chunk
			const rawSlice = bytes.subarray(offset, paddedEnd);
			if (chunkSize % 2 === 1 && paddedEnd === dataEnd) {
				const padded = new Uint8Array(rawSlice.length + 1);
				padded.set(rawSlice);
				keptChunks.push({ fourcc, bytes: padded });
			} else {
				keptChunks.push({ fourcc, bytes: rawSlice });
			}
		} else {
			removedSegments.push(fourcc.trim());
		}

		offset = paddedEnd;
	}

	let trailingKept: Uint8Array | null = null;
	if (riffEnd < bytes.length) {
		const trailing = bytes.subarray(riffEnd);
		const strings = extractReadableStrings(trailing, 4, 6);
		if (stripScope === "all" || hasAiSignal("trailing", strings.join(" "))) {
			removedSegments.push(`Trailing(${bytes.length - riffEnd}B)`);
		} else {
			trailingKept = trailing;
		}
	}

	// Update VP8X flags: keep EXIF/XMP/ICC bits strictly matching kept chunks
	const finalChunks: Uint8Array[] = [];
	for (const chunk of keptChunks) {
		if (chunk.fourcc === "VP8X" && chunk.bytes.length >= 18) {
			const updated = new Uint8Array(chunk.bytes);
			let flags = updated[8];
			if (!keptExif) flags &= ~0x08; // clear EXIF bit
			if (!keptXmp) flags &= ~0x04; // clear XMP bit
			if (!iccPreserved) flags &= ~0x20; // clear ICCP bit
			updated[8] = flags;
			// If no extended features remain, VP8X can be omitted for minimal valid WebP
			if (
				flags === 0 &&
				!hasAlphaOrAnim &&
				!iccPreserved &&
				!keptExif &&
				!keptXmp
			) {
				continue;
			}
			finalChunks.push(updated);
		} else {
			finalChunks.push(chunk.bytes);
		}
	}

	let payloadLen = 4; // "WEBP"
	for (const chunk of finalChunks) {
		payloadLen += chunk.byteLength;
	}

	const output = new Uint8Array(
		8 + payloadLen + (trailingKept ? trailingKept.byteLength : 0),
	);
	// Write RIFF header
	output[0] = 0x52; // R
	output[1] = 0x49; // I
	output[2] = 0x46; // F
	output[3] = 0x46; // F
	const outView = new DataView(output.buffer);
	outView.setUint32(4, payloadLen, true);
	// Write WEBP FourCC
	output[8] = 0x57; // W
	output[9] = 0x45; // E
	output[10] = 0x42; // B
	output[11] = 0x50; // P

	let writePos = 12;
	for (const chunk of finalChunks) {
		output.set(chunk, writePos);
		writePos += chunk.byteLength;
	}
	if (trailingKept) {
		output.set(trailingKept, writePos);
	}

	return {
		bytes: output,
		removedSegments,
		iccPreserved,
	};
}
