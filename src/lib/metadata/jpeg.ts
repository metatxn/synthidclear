import type {
	MetadataEntry,
	ParseResult,
	StripResult,
	StripScope,
} from "./types";
import {
	decodeLatin1,
	decodeUtf8,
	extractIccProfileName,
	extractReadableStrings,
	hasAiSignal,
	parseExifEntries,
	parseXmpEntries,
	readAscii,
	sanitizeDisplayText,
	summarizeEntries,
} from "./utils";

function isSofMarker(marker: number): boolean {
	return (
		marker >= 0xc0 &&
		marker <= 0xcf &&
		marker !== 0xc4 &&
		marker !== 0xc8 &&
		marker !== 0xcc
	);
}

function isStandaloneMarker(marker: number): boolean {
	return (
		(marker >= 0xd0 && marker <= 0xd9) || marker === 0x01 || marker === 0x00
	);
}

/**
 * Finds the start of the next JPEG marker after entropy-coded SOS scan data.
 * Returns the index of the 0xFF byte of the next non-stuffed, non-restart marker.
 */
function findNextMarkerAfterScan(bytes: Uint8Array, start: number): number {
	let i = start;
	while (i < bytes.length - 1) {
		if (bytes[i] === 0xff) {
			const next = bytes[i + 1];
			if (next === 0x00) {
				// Byte-stuffed 0xFF inside entropy stream
				i += 2;
				continue;
			}
			if (next === 0xff) {
				// Fill byte
				i++;
				continue;
			}
			if (next >= 0xd0 && next <= 0xd7) {
				// Restart marker RST0-RST7 inside scan stream
				i += 2;
				continue;
			}
			return i;
		}
		i++;
	}
	return bytes.length;
}

export function parseJpegMetadata(bytes: Uint8Array): ParseResult {
	const entries: MetadataEntry[] = [];
	const parseWarnings: string[] = [];
	let width: number | null = null;
	let height: number | null = null;
	let hasIccProfile = false;
	let iccProfileName: string | null = null;
	let iccTotalBytes = 0;

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let offset = 2; // skip SOI (0xFFD8)
	let segIndex = 0;
	let eoiEndOffset: number | null = null;

	while (offset + 1 < bytes.length) {
		if (bytes[offset] !== 0xff) {
			offset++;
			continue;
		}
		while (offset + 1 < bytes.length && bytes[offset + 1] === 0xff) {
			offset++;
		}
		if (offset + 1 >= bytes.length) break;

		const marker = bytes[offset + 1];
		if (marker === 0xd9) {
			// EOI
			eoiEndOffset = offset + 2;
			break;
		}
		if (isStandaloneMarker(marker)) {
			offset += 2;
			continue;
		}
		if (offset + 4 > bytes.length) {
			parseWarnings.push(`Truncated JPEG segment at byte ${offset}.`);
			break;
		}

		const segLen = view.getUint16(offset + 2, false);
		if (segLen < 2 || offset + 2 + segLen > bytes.length) {
			parseWarnings.push(
				`Invalid JPEG segment length (${segLen}) at byte ${offset}.`,
			);
			break;
		}

		const payloadStart = offset + 4;
		const payloadEnd = offset + 2 + segLen;
		const payload = bytes.subarray(payloadStart, payloadEnd);
		const segBytes = segLen + 2;
		const idPrefix = `jpg-${segIndex}`;

		if (isSofMarker(marker) && payload.length >= 5) {
			height = view.getUint16(payloadStart + 1, false);
			width = view.getUint16(payloadStart + 3, false);
		} else if (marker === 0xe1) {
			// APP1: EXIF or XMP
			const prefix6 = readAscii(payload, 0, 6);
			const prefix29 = readAscii(payload, 0, 29);
			const prefix35 = readAscii(payload, 0, 35);
			if (prefix6 === "Exif\0\0") {
				entries.push(...parseExifEntries(payload, "APP1 (EXIF)", idPrefix));
			} else if (prefix29 === "http://ns.adobe.com/xap/1.0/\0") {
				const xml = decodeUtf8(payload.subarray(29));
				entries.push(...parseXmpEntries(xml, "APP1 (XMP)", segBytes, idPrefix));
			} else if (prefix35 === "http://ns.adobe.com/xmp/extension/\0") {
				const xml = decodeUtf8(payload.subarray(Math.min(75, payload.length)));
				entries.push(
					...parseXmpEntries(xml, "APP1 (Extended XMP)", segBytes, idPrefix),
				);
			} else {
				const strings = extractReadableStrings(payload, 4, 6);
				const val =
					strings.length > 0
						? strings.join(" · ")
						: `APP1 metadata segment (${segBytes.toLocaleString()} bytes)`;
				const aiFlag = hasAiSignal("APP1", val);
				entries.push({
					id: `${idPrefix}-app1`,
					key: "APP1 Metadata Segment",
					value: val,
					category: aiFlag ? "ai-provenance" : "other",
					source: "APP1",
					byteSize: segBytes,
					isAiFlag: aiFlag,
				});
			}
		} else if (marker === 0xe2) {
			// APP2: ICC_PROFILE or MPF
			const prefix12 = readAscii(payload, 0, 12);
			if (prefix12 === "ICC_PROFILE\0") {
				hasIccProfile = true;
				iccTotalBytes += segBytes;
				if (!iccProfileName && payload.length > 14) {
					iccProfileName = extractIccProfileName(payload.subarray(14));
				}
			} else {
				const strings = extractReadableStrings(payload, 4, 6);
				entries.push({
					id: `${idPrefix}-app2`,
					key: "APP2 Extended Segment",
					value:
						strings.length > 0
							? strings.join(" · ")
							: `Binary APP2 payload (${segBytes.toLocaleString()} bytes)`,
					category: "other",
					source: "APP2",
					byteSize: segBytes,
					isAiFlag: false,
				});
			}
		} else if (marker === 0xeb) {
			// APP11: JUMBF / C2PA
			const strings = extractReadableStrings(payload, 4, 10);
			entries.push({
				id: `${idPrefix}-app11`,
				key: "APP11 (C2PA / JUMBF Content Credentials)",
				value:
					strings.length > 0
						? strings.join(" · ")
						: `C2PA / JUMBF box (${segBytes.toLocaleString()} bytes)`,
				category: "ai-provenance",
				source: "APP11",
				byteSize: segBytes,
				isAiFlag: true,
			});
		} else if (marker === 0xed) {
			// APP13: IPTC / Photoshop IRB
			const strings = extractReadableStrings(payload, 4, 8);
			const summary =
				strings.length > 0
					? strings.join(" · ")
					: `IPTC / Photoshop Resource Block (${segBytes.toLocaleString()} bytes)`;
			const aiFlag = hasAiSignal("APP13 IPTC", summary);
			entries.push({
				id: `${idPrefix}-app13`,
				key: "APP13 (IPTC / Photoshop Metadata)",
				value: summary,
				category: aiFlag ? "ai-provenance" : "iptc",
				source: "APP13",
				byteSize: segBytes,
				isAiFlag: aiFlag,
			});
		} else if ((marker >= 0xe3 && marker <= 0xec) || marker === 0xef) {
			const appNum = marker - 0xe0;
			const strings = extractReadableStrings(payload, 4, 6);
			const summary =
				strings.length > 0
					? strings.join(" · ")
					: `APP${appNum} segment (${segBytes.toLocaleString()} bytes)`;
			const aiFlag = hasAiSignal(`APP${appNum}`, summary);
			entries.push({
				id: `${idPrefix}-app${appNum}`,
				key: `APP${appNum} Application Segment`,
				value: summary,
				category: aiFlag ? "ai-provenance" : "other",
				source: `APP${appNum}`,
				byteSize: segBytes,
				isAiFlag: aiFlag,
			});
		} else if (marker === 0xfe) {
			// COM: JPEG Comment
			const commentText = sanitizeDisplayText(decodeLatin1(payload));
			const aiFlag = hasAiSignal("JPEG Comment", commentText);
			entries.push({
				id: `${idPrefix}-com`,
				key: "JPEG Comment (COM)",
				value: commentText || "(empty comment)",
				category: aiFlag ? "ai-provenance" : "comment",
				source: "COM",
				byteSize: segBytes,
				isAiFlag: aiFlag,
			});
		}

		segIndex++;
		if (marker === 0xda) {
			// SOS: skip entropy scan payload until next marker
			offset = findNextMarkerAfterScan(bytes, payloadEnd);
		} else {
			offset = payloadEnd;
		}
	}

	if (hasIccProfile) {
		entries.push({
			id: "jpg-icc-profile",
			key: `ICC Profile: ${iccProfileName ?? "Embedded Color Profile"}`,
			value: `Color profile (${iccTotalBytes.toLocaleString()} bytes) — preserved by default in Lossless mode`,
			category: "icc",
			source: "APP2 (ICC_PROFILE)",
			byteSize: iccTotalBytes,
			isAiFlag: false,
			isPreservedByDefault: true,
		});
	}

	if (eoiEndOffset !== null && eoiEndOffset < bytes.length) {
		const trailingSize = bytes.length - eoiEndOffset;
		const trailingBytes = bytes.subarray(eoiEndOffset);
		const strings = extractReadableStrings(trailingBytes, 4, 6);
		const summary =
			strings.length > 0
				? `${trailingSize.toLocaleString()} bytes after EOI (${strings.join(" · ")})`
				: `${trailingSize.toLocaleString()} trailing bytes appended after EOI`;
		const aiFlag = hasAiSignal("trailing", summary);
		entries.push({
			id: "jpg-trailing",
			key: "Trailing Bytes After EOI",
			value: summary,
			category: aiFlag ? "ai-provenance" : "trailing",
			source: "Post-EOI",
			byteSize: trailingSize,
			isAiFlag: aiFlag,
		});
	}

	const { aiFlagCount, strippableCount } = summarizeEntries(entries);
	return {
		format: "jpeg",
		mimeType: "image/jpeg",
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

export function stripJpegLossless(
	bytes: Uint8Array,
	preserveIcc: boolean,
	stripScope: StripScope = "all",
): StripResult {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const keptSlices: Uint8Array[] = [bytes.subarray(0, 2)]; // SOI
	const removedSegments: string[] = [];
	let iccPreserved = false;
	let totalLength = 2;

	let offset = 2;
	let foundEoi = false;

	while (offset + 1 < bytes.length) {
		if (bytes[offset] !== 0xff) {
			offset++;
			continue;
		}
		const markerStart = offset;
		while (offset + 1 < bytes.length && bytes[offset + 1] === 0xff) {
			offset++;
		}
		if (offset + 1 >= bytes.length) break;

		const marker = bytes[offset + 1];
		if (marker === 0xd9) {
			// EOI
			const slice = new Uint8Array([0xff, 0xd9]);
			keptSlices.push(slice);
			totalLength += 2;
			offset += 2;
			foundEoi = true;
			break;
		}

		if (isStandaloneMarker(marker)) {
			const slice = bytes.subarray(markerStart, offset + 2);
			keptSlices.push(slice);
			totalLength += slice.byteLength;
			offset += 2;
			continue;
		}

		if (offset + 4 > bytes.length) break;
		const segLen = view.getUint16(offset + 2, false);
		if (segLen < 2 || offset + 2 + segLen > bytes.length) break;

		const segEnd = offset + 2 + segLen;
		const payload = bytes.subarray(offset + 4, segEnd);

		if (marker === 0xda) {
			// SOS + entropy-coded scan data up to next marker
			const nextMarkerPos = findNextMarkerAfterScan(bytes, segEnd);
			const scanSlice = bytes.subarray(offset, nextMarkerPos);
			keptSlices.push(scanSlice);
			totalLength += scanSlice.byteLength;
			offset = nextMarkerPos;
			continue;
		}

		let shouldKeep = true;
		let strippedLabel = "";

		if (marker === 0xe0 || marker === 0xee) {
			// APP0 (JFIF) & APP14 (Adobe color transform) — preserve!
			shouldKeep = true;
		} else if (marker === 0xe2) {
			// APP2 — preserve only if ICC_PROFILE\0 and preserveIcc is true
			const isIcc = readAscii(payload, 0, 12) === "ICC_PROFILE\0";
			if (isIcc && preserveIcc) {
				shouldKeep = true;
				iccPreserved = true;
			} else if (stripScope === "ai-only" && !isIcc) {
				const strings = extractReadableStrings(payload, 4, 6);
				shouldKeep = !hasAiSignal("APP2", strings.join(" "));
				if (!shouldKeep) strippedLabel = "APP2";
			} else {
				shouldKeep = false;
				strippedLabel = isIcc ? "APP2(ICC)" : "APP2";
			}
		} else if (marker === 0xeb) {
			// APP11 (C2PA / JUMBF) — always strip
			shouldKeep = false;
			strippedLabel = "APP11";
		} else if (marker >= 0xe1 && marker <= 0xef) {
			const appNum = marker - 0xe0;
			if (stripScope === "ai-only") {
				if (marker === 0xe1) {
					const prefix6 = readAscii(payload, 0, 6);
					const prefix29 = readAscii(payload, 0, 29);
					const prefix35 = readAscii(payload, 0, 35);
					if (prefix6 === "Exif\0\0") {
						const exifAi = parseExifEntries(payload, "APP1", "chk").some(
							(e) => e.isAiFlag,
						);
						shouldKeep = !exifAi;
					} else if (prefix29 === "http://ns.adobe.com/xap/1.0/\0") {
						shouldKeep = !hasAiSignal("XMP", decodeUtf8(payload.subarray(29)));
					} else if (prefix35 === "http://ns.adobe.com/xmp/extension/\0") {
						shouldKeep = !hasAiSignal(
							"XMP",
							decodeUtf8(payload.subarray(Math.min(75, payload.length))),
						);
					} else {
						const strings = extractReadableStrings(payload, 4, 6);
						shouldKeep = !hasAiSignal("APP1", strings.join(" "));
					}
				} else {
					const strings = extractReadableStrings(payload, 4, 6);
					shouldKeep = !hasAiSignal(`APP${appNum}`, strings.join(" "));
				}
				if (!shouldKeep) strippedLabel = `APP${appNum}`;
			} else {
				shouldKeep = false;
				strippedLabel = `APP${appNum}`;
			}
		} else if (marker === 0xfe) {
			if (stripScope === "ai-only") {
				shouldKeep = !hasAiSignal("JPEG Comment", decodeLatin1(payload));
				if (!shouldKeep) strippedLabel = "COM";
			} else {
				shouldKeep = false;
				strippedLabel = "COM";
			}
		}

		if (shouldKeep) {
			const slice = bytes.subarray(offset, segEnd);
			keptSlices.push(slice);
			totalLength += slice.byteLength;
		} else {
			removedSegments.push(strippedLabel);
		}

		offset = segEnd;
	}

	if (foundEoi && offset < bytes.length) {
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
