import type {
	MetadataEntry,
	ParseResult,
	StripResult,
	StripScope,
} from "./types";
import {
	decodeLatin1,
	decodeUtf8,
	decompressZlib,
	extractReadableStrings,
	hasAiSignal,
	parseExifEntries,
	parseXmpEntries,
	readAscii,
	sanitizeDisplayText,
	summarizeEntries,
} from "./utils";

const PNG_PRESERVE_CHUNKS = new Set([
	"IHDR",
	"PLTE",
	"IDAT",
	"IEND",
	"tRNS",
	"sRGB",
	"gAMA",
	"cHRM",
	"pHYs",
	"bKGD",
	"sBIT",
	"sPLT",
	"hIST",
	"acTL",
	"fcTL",
	"fdAT",
	"cICP",
	"mDCv",
	"cLLi",
]);

export async function parsePngMetadata(
	bytes: Uint8Array,
): Promise<ParseResult> {
	const entries: MetadataEntry[] = [];
	const parseWarnings: string[] = [];
	let width: number | null = null;
	let height: number | null = null;
	let hasIccProfile = false;
	let iccProfileName: string | null = null;

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let offset = 8;
	let chunkIndex = 0;
	let iendEndOffset: number | null = null;

	while (offset + 12 <= bytes.length) {
		const length = view.getUint32(offset, false);
		const type = readAscii(bytes, offset + 4, 4);
		const dataStart = offset + 8;
		const dataEnd = dataStart + length;
		const chunkEnd = dataEnd + 4;

		if (chunkEnd > bytes.length) {
			parseWarnings.push(`Truncated PNG chunk "${type}" at byte ${offset}.`);
			break;
		}

		const data = bytes.subarray(dataStart, dataEnd);
		const idPrefix = `png-${chunkIndex}`;

		if (type === "IHDR" && length >= 8) {
			width = view.getUint32(dataStart, false);
			height = view.getUint32(dataStart + 4, false);
		} else if (type === "iCCP") {
			hasIccProfile = true;
			const nullIdx = data.indexOf(0);
			const profileName =
				nullIdx > 0
					? decodeLatin1(data.subarray(0, nullIdx))
					: "Embedded ICC Profile";
			iccProfileName = profileName;
			entries.push({
				id: `${idPrefix}-iccp`,
				key: `ICC Profile: ${profileName}`,
				value: `Color profile (${length.toLocaleString()} bytes) — preserved by default in Lossless mode`,
				category: "icc",
				source: "iCCP",
				byteSize: length + 12,
				isAiFlag: false,
				isPreservedByDefault: true,
			});
		} else if (type === "tEXt") {
			const nullIdx = data.indexOf(0);
			const keyword =
				nullIdx >= 0 ? decodeLatin1(data.subarray(0, nullIdx)) : "tEXt";
			const textVal =
				nullIdx >= 0
					? decodeLatin1(data.subarray(nullIdx + 1))
					: decodeLatin1(data);
			const cleanVal = sanitizeDisplayText(textVal);
			if (keyword.toLowerCase().includes("xmp") && textVal.includes("<")) {
				entries.push(
					...parseXmpEntries(
						textVal,
						`tEXt (${keyword})`,
						length + 12,
						idPrefix,
					),
				);
			} else {
				const aiFlag = hasAiSignal(keyword, cleanVal);
				entries.push({
					id: `${idPrefix}-text`,
					key: `tEXt: ${keyword}`,
					value: cleanVal || "(empty)",
					category: aiFlag ? "ai-provenance" : "png-text",
					source: "tEXt",
					byteSize: length + 12,
					isAiFlag: aiFlag,
				});
			}
		} else if (type === "iTXt") {
			const null1 = data.indexOf(0);
			const keyword =
				null1 >= 0 ? decodeLatin1(data.subarray(0, null1)) : "iTXt";
			let textVal = "";
			if (null1 >= 0 && null1 + 3 <= data.length) {
				const compressionFlag = data[null1 + 1];
				const afterFlags = null1 + 3;
				const null2 = data.indexOf(0, afterFlags);
				const afterLang = null2 >= 0 ? null2 + 1 : afterFlags;
				const null3 = data.indexOf(0, afterLang);
				const textStart = null3 >= 0 ? null3 + 1 : afterLang;
				const rawTextBytes = data.subarray(textStart);
				if (compressionFlag === 1) {
					const inflated = await decompressZlib(rawTextBytes);
					textVal = inflated
						? decodeUtf8(inflated)
						: `[Compressed iTXt payload: ${rawTextBytes.length} bytes]`;
				} else {
					textVal = decodeUtf8(rawTextBytes);
				}
			} else {
				textVal = decodeUtf8(data);
			}

			if (
				keyword.toLowerCase().includes("xmp") ||
				textVal.includes("<x:xmpmeta") ||
				textVal.includes("<rdf:RDF")
			) {
				entries.push(
					...parseXmpEntries(
						textVal,
						`iTXt (${keyword})`,
						length + 12,
						idPrefix,
					),
				);
			} else {
				const cleanVal = sanitizeDisplayText(textVal);
				const aiFlag = hasAiSignal(keyword, cleanVal);
				entries.push({
					id: `${idPrefix}-itxt`,
					key: `iTXt: ${keyword}`,
					value: cleanVal || "(empty)",
					category: aiFlag ? "ai-provenance" : "png-text",
					source: "iTXt",
					byteSize: length + 12,
					isAiFlag: aiFlag,
				});
			}
		} else if (type === "zTXt") {
			const nullIdx = data.indexOf(0);
			const keyword =
				nullIdx >= 0 ? decodeLatin1(data.subarray(0, nullIdx)) : "zTXt";
			let textVal = `[Compressed zTXt payload: ${length} bytes]`;
			if (nullIdx >= 0 && nullIdx + 2 < data.length) {
				const inflated = await decompressZlib(data.subarray(nullIdx + 2));
				if (inflated) {
					textVal = decodeLatin1(inflated);
				}
			}
			const cleanVal = sanitizeDisplayText(textVal);
			const aiFlag = hasAiSignal(keyword, cleanVal);
			entries.push({
				id: `${idPrefix}-ztxt`,
				key: `zTXt: ${keyword}`,
				value: cleanVal,
				category: aiFlag ? "ai-provenance" : "png-text",
				source: "zTXt",
				byteSize: length + 12,
				isAiFlag: aiFlag,
			});
		} else if (type === "eXIf") {
			entries.push(...parseExifEntries(data, "eXIf", idPrefix));
		} else if (type === "caBX" || type === "jumb" || type === "c2pa") {
			const strings = extractReadableStrings(data, 4, 10);
			entries.push({
				id: `${idPrefix}-c2pa`,
				key: `${type} (C2PA / JUMBF Content Credentials)`,
				value:
					strings.length > 0
						? strings.join(" · ")
						: `Binary C2PA / JUMBF manifest (${length.toLocaleString()} bytes)`,
				category: "ai-provenance",
				source: type,
				byteSize: length + 12,
				isAiFlag: true,
			});
		} else if (type === "tIME" && length >= 7) {
			const year = view.getUint16(dataStart, false);
			const month = String(data[2]).padStart(2, "0");
			const day = String(data[3]).padStart(2, "0");
			const hour = String(data[4]).padStart(2, "0");
			const minute = String(data[5]).padStart(2, "0");
			const second = String(data[6]).padStart(2, "0");
			entries.push({
				id: `${idPrefix}-time`,
				key: "PNG Modification Timestamp (tIME)",
				value: `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`,
				category: "timestamp",
				source: "tIME",
				byteSize: length + 12,
				isAiFlag: false,
			});
		} else if (!PNG_PRESERVE_CHUNKS.has(type)) {
			const strings = extractReadableStrings(data, 4, 6);
			const summary =
				strings.length > 0
					? strings.join(" · ")
					: `Ancillary chunk (${length.toLocaleString()} bytes)`;
			const aiFlag = hasAiSignal(type, summary);
			entries.push({
				id: `${idPrefix}-other`,
				key: `Ancillary Chunk: ${type}`,
				value: summary,
				category: aiFlag ? "ai-provenance" : "other",
				source: type,
				byteSize: length + 12,
				isAiFlag: aiFlag,
			});
		}

		offset = chunkEnd;
		chunkIndex++;
		if (type === "IEND") {
			iendEndOffset = offset;
			break;
		}
	}

	if (iendEndOffset !== null && iendEndOffset < bytes.length) {
		const trailingSize = bytes.length - iendEndOffset;
		const trailingBytes = bytes.subarray(iendEndOffset);
		const strings = extractReadableStrings(trailingBytes, 4, 6);
		const summary =
			strings.length > 0
				? `${trailingSize.toLocaleString()} bytes after IEND (${strings.join(" · ")})`
				: `${trailingSize.toLocaleString()} trailing bytes appended after IEND`;
		const aiFlag = hasAiSignal("trailing", summary);
		entries.push({
			id: "png-trailing",
			key: "Trailing Bytes After IEND",
			value: summary,
			category: aiFlag ? "ai-provenance" : "trailing",
			source: "Post-IEND",
			byteSize: trailingSize,
			isAiFlag: aiFlag,
		});
	}

	const { aiFlagCount, strippableCount } = summarizeEntries(entries);
	return {
		format: "png",
		mimeType: "image/png",
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

async function isPngTextChunkAi(
	type: string,
	data: Uint8Array,
): Promise<boolean> {
	if (type === "tEXt") {
		const nullIdx = data.indexOf(0);
		const keyword =
			nullIdx >= 0 ? decodeLatin1(data.subarray(0, nullIdx)) : "tEXt";
		const val =
			nullIdx >= 0
				? decodeLatin1(data.subarray(nullIdx + 1))
				: decodeLatin1(data);
		return hasAiSignal(keyword, val);
	}
	if (type === "iTXt") {
		const null1 = data.indexOf(0);
		const keyword = null1 >= 0 ? decodeLatin1(data.subarray(0, null1)) : "iTXt";
		let textVal = "";
		if (null1 >= 0 && null1 + 3 <= data.length) {
			const compressionFlag = data[null1 + 1];
			const afterFlags = null1 + 3;
			const null2 = data.indexOf(0, afterFlags);
			const afterLang = null2 >= 0 ? null2 + 1 : afterFlags;
			const null3 = data.indexOf(0, afterLang);
			const textStart = null3 >= 0 ? null3 + 1 : afterLang;
			const rawBytes = data.subarray(textStart);
			if (compressionFlag === 1) {
				const inflated = await decompressZlib(rawBytes);
				textVal = inflated ? decodeUtf8(inflated) : "";
			} else {
				textVal = decodeUtf8(rawBytes);
			}
		} else {
			textVal = decodeUtf8(data);
		}
		return hasAiSignal(keyword, textVal);
	}
	if (type === "zTXt") {
		const nullIdx = data.indexOf(0);
		const keyword =
			nullIdx >= 0 ? decodeLatin1(data.subarray(0, nullIdx)) : "zTXt";
		let textVal = "";
		if (nullIdx >= 0 && nullIdx + 2 < data.length) {
			const inflated = await decompressZlib(data.subarray(nullIdx + 2));
			if (inflated) textVal = decodeLatin1(inflated);
		}
		return hasAiSignal(keyword, textVal);
	}
	return false;
}

export async function stripPngLossless(
	bytes: Uint8Array,
	preserveIcc: boolean,
	stripScope: StripScope = "all",
): Promise<StripResult> {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const keptSlices: Uint8Array[] = [bytes.subarray(0, 8)];
	const removedSegments: string[] = [];
	let iccPreserved = false;
	let totalLength = 8;

	let offset = 8;
	let foundIend = false;

	while (offset + 12 <= bytes.length) {
		const length = view.getUint32(offset, false);
		const type = readAscii(bytes, offset + 4, 4);
		const chunkEnd = offset + 12 + length;

		if (chunkEnd > bytes.length) {
			break;
		}

		let keep =
			PNG_PRESERVE_CHUNKS.has(type) || (type === "iCCP" && preserveIcc);

		if (!keep && stripScope === "ai-only") {
			if (type === "caBX" || type === "jumb" || type === "c2pa") {
				keep = false;
			} else if (type === "tEXt" || type === "iTXt" || type === "zTXt") {
				const data = bytes.subarray(offset + 8, offset + 8 + length);
				keep = !(await isPngTextChunkAi(type, data));
			} else if (type === "eXIf") {
				const data = bytes.subarray(offset + 8, offset + 8 + length);
				keep = !parseExifEntries(data, "eXIf", "chk").some((e) => e.isAiFlag);
			} else if (type === "tIME") {
				keep = true;
			} else {
				const data = bytes.subarray(offset + 8, offset + 8 + length);
				const strings = extractReadableStrings(data, 4, 6);
				keep = !hasAiSignal(type, strings.join(" "));
			}
		}

		if (keep) {
			if (type === "iCCP") iccPreserved = true;
			const slice = bytes.subarray(offset, chunkEnd);
			keptSlices.push(slice);
			totalLength += slice.byteLength;
		} else {
			removedSegments.push(type);
		}

		offset = chunkEnd;
		if (type === "IEND") {
			foundIend = true;
			break;
		}
	}

	if (foundIend && offset < bytes.length) {
		const trailing = bytes.subarray(offset);
		const trailingStrings = extractReadableStrings(trailing, 4, 6);
		if (
			stripScope === "all" ||
			hasAiSignal("trailing", trailingStrings.join(" "))
		) {
			removedSegments.push(`Trailing(${bytes.length - offset}B)`);
		} else {
			keptSlices.push(trailing);
			totalLength += trailing.byteLength;
		}
	}

	const output = new Uint8Array(totalLength);
	let writePos = 0;
	for (const slice of keptSlices) {
		output.set(slice, writePos);
		writePos += slice.byteLength;
	}

	return {
		bytes: output,
		removedSegments,
		iccPreserved,
	};
}
