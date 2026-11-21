import type {
	ImageFormat,
	MetadataEntry,
	ParseResult,
	StripResult,
	StripScope,
} from "./types";
import {
	decodeUtf8,
	detectImageFormat,
	extractIccProfileName,
	extractReadableStrings,
	formatToMime,
	hasAiSignal,
	parseExifEntries,
	parseXmpEntries,
	readAscii,
	summarizeEntries,
} from "./utils";

interface IsoBox {
	type: string;
	start: number;
	end: number;
	headerSize: number;
	dataStart: number;
	size: number;
}

interface InfeItem {
	itemId: number;
	version: number;
	itemType: string;
	itemName: string;
	contentType: string;
	rawBox: Uint8Array;
}

interface IlocExtent {
	extentIndex: number;
	extentOffset: number;
	extentLength: number;
}

interface IlocItem {
	itemId: number;
	constructionMethod: number;
	dataRefIndex: number;
	baseOffset: number;
	extents: IlocExtent[];
}

interface IlocTable {
	version: number;
	flags: number;
	offsetSize: number;
	lengthSize: number;
	baseOffsetSize: number;
	indexSize: number;
	items: IlocItem[];
}

const XMP_UUID = new Uint8Array([
	0xbe, 0x7a, 0xcf, 0xcb, 0x97, 0xa9, 0x42, 0xe8, 0x9c, 0x71, 0x99, 0x94, 0x91,
	0xe3, 0xaf, 0xac,
]);

const C2PA_UUID = new Uint8Array([
	0xd8, 0xfe, 0xc3, 0xd6, 0x1b, 0x0e, 0x48, 0x3c, 0x92, 0x97, 0x58, 0x28, 0x87,
	0x7e, 0xc4, 0x81,
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

function readBoxes(
	bytes: Uint8Array,
	start: number,
	end: number,
): { boxes: IsoBox[]; parsedEnd: number } {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const boxes: IsoBox[] = [];
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

		if (size < headerSize || offset + size > end) {
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

	return { boxes, parsedEnd: offset };
}

function readUintN(
	view: DataView,
	bytes: Uint8Array,
	offset: number,
	byteLen: number,
): number {
	if (byteLen === 0 || offset + byteLen > bytes.length) return 0;
	if (byteLen === 1) return bytes[offset];
	if (byteLen === 2) return view.getUint16(offset, false);
	if (byteLen === 4) return view.getUint32(offset, false);
	if (byteLen === 8) return Number(view.getBigUint64(offset, false));
	let val = 0;
	for (let i = 0; i < byteLen; i++) {
		val = val * 256 + bytes[offset + i];
	}
	return val;
}

function writeUintN(
	view: DataView,
	bytes: Uint8Array,
	offset: number,
	byteLen: number,
	value: number,
): void {
	if (byteLen === 0) return;
	if (byteLen === 1) {
		bytes[offset] = value & 0xff;
		return;
	}
	if (byteLen === 2) {
		view.setUint16(offset, value, false);
		return;
	}
	if (byteLen === 4) {
		view.setUint32(offset, value >>> 0, false);
		return;
	}
	if (byteLen === 8) {
		view.setBigUint64(offset, BigInt(Math.max(0, Math.floor(value))), false);
		return;
	}
	let remaining = Math.max(0, Math.floor(value));
	for (let i = byteLen - 1; i >= 0; i--) {
		bytes[offset + i] = remaining & 0xff;
		remaining = Math.floor(remaining / 256);
	}
}

function readNullTermString(
	bytes: Uint8Array,
	start: number,
	end: number,
): { value: string; next: number } {
	let idx = start;
	while (idx < end && bytes[idx] !== 0) {
		idx++;
	}
	const value = decodeUtf8(bytes.subarray(start, idx));
	return { value, next: idx < end ? idx + 1 : end };
}

function parseIinfBox(bytes: Uint8Array, box: IsoBox): InfeItem[] {
	const dataStart = box.dataStart;
	const end = box.end;
	if (dataStart + 4 > end) return [];

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const version = bytes[dataStart];
	const countOffset = dataStart + 4;
	if (countOffset + (version === 0 ? 2 : 4) > end) return [];

	const entryCount =
		version === 0
			? view.getUint16(countOffset, false)
			: view.getUint32(countOffset, false);
	const childrenStart = countOffset + (version === 0 ? 2 : 4);
	const { boxes } = readBoxes(bytes, childrenStart, end);

	const items: InfeItem[] = [];
	for (let i = 0; i < Math.min(entryCount, boxes.length); i++) {
		const child = boxes[i];
		if (child.type !== "infe") continue;
		const d = child.dataStart;
		if (d + 4 > child.end) continue;
		const infeVer = bytes[d];
		let itemId = 0;
		let itemType = "";
		let itemName = "";
		let contentType = "";

		if (infeVer === 2 && d + 12 <= child.end) {
			itemId = view.getUint16(d + 4, false);
			itemType = readAscii(bytes, d + 8, 4);
			const nameRes = readNullTermString(bytes, d + 12, child.end);
			itemName = nameRes.value;
			if (itemType === "mime" && nameRes.next < child.end) {
				contentType = readNullTermString(bytes, nameRes.next, child.end).value;
			}
		} else if (infeVer >= 3 && d + 14 <= child.end) {
			itemId = view.getUint32(d + 4, false);
			itemType = readAscii(bytes, d + 10, 4);
			const nameRes = readNullTermString(bytes, d + 14, child.end);
			itemName = nameRes.value;
			if (itemType === "mime" && nameRes.next < child.end) {
				contentType = readNullTermString(bytes, nameRes.next, child.end).value;
			}
		} else if (infeVer <= 1 && d + 8 <= child.end) {
			itemId = view.getUint16(d + 4, false);
			itemName = readNullTermString(bytes, d + 8, child.end).value;
			if (itemName.toLowerCase().includes("exif")) {
				itemType = "Exif";
			}
		}

		items.push({
			itemId,
			version: infeVer,
			itemType,
			itemName,
			contentType,
			rawBox: bytes.subarray(child.start, child.end),
		});
	}

	return items;
}

function parseIlocBox(bytes: Uint8Array, box: IsoBox): IlocTable | null {
	const d = box.dataStart;
	const end = box.end;
	if (d + 8 > end) return null;

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const version = bytes[d];
	const flags = (bytes[d + 1] << 16) | (bytes[d + 2] << 8) | bytes[d + 3];
	const offsetSize = bytes[d + 4] >> 4;
	const lengthSize = bytes[d + 4] & 0x0f;
	const baseOffsetSize = bytes[d + 5] >> 4;
	const indexSize = version === 1 || version === 2 ? bytes[d + 5] & 0x0f : 0;

	let cursor = d + 6;
	let itemCount = 0;
	if (version < 2) {
		if (cursor + 2 > end) return null;
		itemCount = view.getUint16(cursor, false);
		cursor += 2;
	} else {
		if (cursor + 4 > end) return null;
		itemCount = view.getUint32(cursor, false);
		cursor += 4;
	}

	const items: IlocItem[] = [];
	for (let i = 0; i < itemCount && cursor < end; i++) {
		let itemId = 0;
		if (version < 2) {
			if (cursor + 2 > end) break;
			itemId = view.getUint16(cursor, false);
			cursor += 2;
		} else {
			if (cursor + 4 > end) break;
			itemId = view.getUint32(cursor, false);
			cursor += 4;
		}

		let constructionMethod = 0;
		if (version === 1 || version === 2) {
			if (cursor + 2 > end) break;
			constructionMethod = view.getUint16(cursor, false) & 0x0f;
			cursor += 2;
		}

		if (cursor + 2 + baseOffsetSize + 2 > end) break;
		const dataRefIndex = view.getUint16(cursor, false);
		cursor += 2;
		const baseOffset = readUintN(view, bytes, cursor, baseOffsetSize);
		cursor += baseOffsetSize;
		const extentCount = view.getUint16(cursor, false);
		cursor += 2;

		const extents: IlocExtent[] = [];
		for (let j = 0; j < extentCount; j++) {
			const needed =
				(version === 1 || version === 2 ? indexSize : 0) +
				offsetSize +
				lengthSize;
			if (cursor + needed > end) break;
			let extentIndex = 0;
			if (version === 1 || version === 2) {
				extentIndex = readUintN(view, bytes, cursor, indexSize);
				cursor += indexSize;
			}
			const extentOffset = readUintN(view, bytes, cursor, offsetSize);
			cursor += offsetSize;
			const extentLength = readUintN(view, bytes, cursor, lengthSize);
			cursor += lengthSize;
			extents.push({ extentIndex, extentOffset, extentLength });
		}

		items.push({
			itemId,
			constructionMethod,
			dataRefIndex,
			baseOffset,
			extents,
		});
	}

	return {
		version,
		flags,
		offsetSize,
		lengthSize,
		baseOffsetSize,
		indexSize,
		items,
	};
}

function readItemBytes(
	bytes: Uint8Array,
	ilocItem: IlocItem | undefined,
	idatBox: IsoBox | undefined,
): Uint8Array | null {
	if (!ilocItem || ilocItem.extents.length === 0) return null;
	if (ilocItem.constructionMethod === 2) return null;

	const slices: Uint8Array[] = [];
	let totalLen = 0;

	for (const ext of ilocItem.extents) {
		if (ext.extentLength === 0) continue;
		const start =
			ilocItem.constructionMethod === 1 && idatBox
				? idatBox.dataStart + ilocItem.baseOffset + ext.extentOffset
				: ilocItem.baseOffset + ext.extentOffset;
		const end = start + ext.extentLength;
		if (start < 0 || end > bytes.length) continue;
		const slice = bytes.subarray(start, end);
		slices.push(slice);
		totalLen += slice.byteLength;
	}

	if (totalLen === 0) return null;
	if (slices.length === 1) return slices[0];

	const combined = new Uint8Array(totalLen);
	let pos = 0;
	for (const slice of slices) {
		combined.set(slice, pos);
		pos += slice.byteLength;
	}
	return combined;
}

function classifyInfeMetadata(item: InfeItem): "exif" | "xmp" | "c2pa" | null {
	const typeLower = item.itemType.toLowerCase();
	const nameLower = item.itemName.toLowerCase();
	const contentLower = item.contentType.toLowerCase();

	if (typeLower === "exif") {
		return "exif";
	}
	if (
		typeLower === "c2pa" ||
		typeLower === "jumb" ||
		nameLower.includes("c2pa") ||
		contentLower.includes("c2pa") ||
		contentLower.includes("jumbf")
	) {
		return "c2pa";
	}
	if (
		typeLower === "mime" &&
		(contentLower.includes("rdf+xml") ||
			contentLower.includes("xmp") ||
			nameLower.includes("xmp"))
	) {
		return "xmp";
	}
	return null;
}

function wrapBox(type: string, payload: Uint8Array): Uint8Array {
	const out = new Uint8Array(8 + payload.byteLength);
	const view = new DataView(out.buffer);
	view.setUint32(0, out.byteLength, false);
	for (let i = 0; i < 4; i++) {
		out[4 + i] = type.charCodeAt(i);
	}
	out.set(payload, 8);
	return out;
}

function buildIinfBox(
	originalBytes: Uint8Array,
	originalBox: IsoBox,
	keptInfeItems: InfeItem[],
): Uint8Array {
	const version = originalBytes[originalBox.dataStart];
	const headerLen = version === 0 ? 6 : 8;
	const childrenLen = keptInfeItems.reduce(
		(sum, it) => sum + it.rawBox.byteLength,
		0,
	);
	const payload = new Uint8Array(headerLen + childrenLen);
	payload.set(
		originalBytes.subarray(
			originalBox.dataStart,
			originalBox.dataStart + headerLen,
		),
		0,
	);
	const view = new DataView(payload.buffer);
	if (version === 0) {
		view.setUint16(4, keptInfeItems.length, false);
	} else {
		view.setUint32(4, keptInfeItems.length, false);
	}
	let pos = headerLen;
	for (const it of keptInfeItems) {
		payload.set(it.rawBox, pos);
		pos += it.rawBox.byteLength;
	}
	return wrapBox("iinf", payload);
}

function buildIlocBox(table: IlocTable, keptItems: IlocItem[]): Uint8Array {
	const headerLen = table.version < 2 ? 8 : 10;
	const itemIdLen = table.version < 2 ? 2 : 4;
	const methodLen = table.version === 1 || table.version === 2 ? 2 : 0;
	const indexLen =
		table.version === 1 || table.version === 2 ? table.indexSize : 0;
	const extentLen = indexLen + table.offsetSize + table.lengthSize;

	let itemsByteSize = 0;
	for (const item of keptItems) {
		itemsByteSize +=
			itemIdLen +
			methodLen +
			2 +
			table.baseOffsetSize +
			2 +
			item.extents.length * extentLen;
	}

	const payload = new Uint8Array(headerLen + itemsByteSize);
	const view = new DataView(payload.buffer);

	payload[0] = table.version;
	payload[1] = (table.flags >> 16) & 0xff;
	payload[2] = (table.flags >> 8) & 0xff;
	payload[3] = table.flags & 0xff;
	payload[4] = ((table.offsetSize & 0x0f) << 4) | (table.lengthSize & 0x0f);
	payload[5] =
		((table.baseOffsetSize & 0x0f) << 4) |
		(table.version === 1 || table.version === 2 ? table.indexSize & 0x0f : 0);

	if (table.version < 2) {
		view.setUint16(6, keptItems.length, false);
	} else {
		view.setUint32(6, keptItems.length, false);
	}

	let pos = headerLen;
	for (const item of keptItems) {
		if (table.version < 2) {
			view.setUint16(pos, item.itemId, false);
			pos += 2;
		} else {
			view.setUint32(pos, item.itemId, false);
			pos += 4;
		}

		if (table.version === 1 || table.version === 2) {
			view.setUint16(pos, item.constructionMethod & 0x0f, false);
			pos += 2;
		}

		view.setUint16(pos, item.dataRefIndex, false);
		pos += 2;
		writeUintN(view, payload, pos, table.baseOffsetSize, item.baseOffset);
		pos += table.baseOffsetSize;
		view.setUint16(pos, item.extents.length, false);
		pos += 2;

		for (const ext of item.extents) {
			if (table.version === 1 || table.version === 2) {
				writeUintN(view, payload, pos, table.indexSize, ext.extentIndex);
				pos += table.indexSize;
			}
			writeUintN(view, payload, pos, table.offsetSize, ext.extentOffset);
			pos += table.offsetSize;
			writeUintN(view, payload, pos, table.lengthSize, ext.extentLength);
			pos += table.lengthSize;
		}
	}

	return wrapBox("iloc", payload);
}

function rebuildIrefBox(
	bytes: Uint8Array,
	irefBox: IsoBox,
	strippedIds: Set<number>,
): Uint8Array | null {
	const d = irefBox.dataStart;
	if (d + 4 > irefBox.end) return bytes.subarray(irefBox.start, irefBox.end);

	const version = bytes[d];
	const idSize = version === 0 ? 2 : 4;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const { boxes } = readBoxes(bytes, d + 4, irefBox.end);

	const keptRefs: Uint8Array[] = [];
	for (const refBox of boxes) {
		const rd = refBox.dataStart;
		if (rd + idSize + 2 > refBox.end) continue;
		const fromId = readUintN(view, bytes, rd, idSize);
		if (strippedIds.has(fromId)) continue;

		const refCount = view.getUint16(rd + idSize, false);
		const keptToIds: number[] = [];
		let cursor = rd + idSize + 2;
		for (let i = 0; i < refCount && cursor + idSize <= refBox.end; i++) {
			const toId = readUintN(view, bytes, cursor, idSize);
			if (!strippedIds.has(toId)) {
				keptToIds.push(toId);
			}
			cursor += idSize;
		}
		if (keptToIds.length === 0) continue;

		const newPayload = new Uint8Array(idSize + 2 + keptToIds.length * idSize);
		const newView = new DataView(newPayload.buffer);
		writeUintN(newView, newPayload, 0, idSize, fromId);
		newView.setUint16(idSize, keptToIds.length, false);
		let wp = idSize + 2;
		for (const toId of keptToIds) {
			writeUintN(newView, newPayload, wp, idSize, toId);
			wp += idSize;
		}
		keptRefs.push(wrapBox(refBox.type, newPayload));
	}

	if (keptRefs.length === 0) return null;
	const innerSize = 4 + keptRefs.reduce((s, r) => s + r.byteLength, 0);
	const payload = new Uint8Array(innerSize);
	payload.set(bytes.subarray(d, d + 4), 0);
	let pos = 4;
	for (const r of keptRefs) {
		payload.set(r, pos);
		pos += r.byteLength;
	}
	return wrapBox("iref", payload);
}

function rebuildIpmaBox(
	bytes: Uint8Array,
	ipmaBox: IsoBox,
	indexMap: number[],
	strippedIds: Set<number>,
): Uint8Array {
	const d = ipmaBox.dataStart;
	const end = ipmaBox.end;
	if (d + 8 > end) return bytes.subarray(ipmaBox.start, ipmaBox.end);

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const version = bytes[d];
	const flags = (bytes[d + 1] << 16) | (bytes[d + 2] << 8) | bytes[d + 3];
	const largeIdx = (flags & 1) !== 0;
	const idSize = version < 1 ? 2 : 4;
	const assocSize = largeIdx ? 2 : 1;
	const entryCount = view.getUint32(d + 4, false);

	interface IpmaEntry {
		itemId: number;
		assocs: Array<{ essential: number; propIdx: number }>;
	}

	const keptEntries: IpmaEntry[] = [];
	let cursor = d + 8;

	for (let i = 0; i < entryCount; i++) {
		if (cursor + idSize + 1 > end) {
			return bytes.subarray(ipmaBox.start, ipmaBox.end);
		}
		const itemId = readUintN(view, bytes, cursor, idSize);
		cursor += idSize;
		const assocCount = bytes[cursor];
		cursor += 1;
		if (cursor + assocCount * assocSize > end) {
			return bytes.subarray(ipmaBox.start, ipmaBox.end);
		}

		const remapped: Array<{ essential: number; propIdx: number }> = [];
		for (let j = 0; j < assocCount; j++) {
			let essential = 0;
			let propIdx = 0;
			if (largeIdx) {
				const raw = view.getUint16(cursor, false);
				cursor += 2;
				essential = (raw >> 15) & 1;
				propIdx = raw & 0x7fff;
			} else {
				const raw = bytes[cursor];
				cursor += 1;
				essential = (raw >> 7) & 1;
				propIdx = raw & 0x7f;
			}
			if (propIdx === 0) {
				remapped.push({ essential, propIdx: 0 });
			} else {
				const mapped = propIdx < indexMap.length ? indexMap[propIdx] : propIdx;
				if (mapped > 0) {
					remapped.push({ essential, propIdx: mapped });
				}
			}
		}

		if (!strippedIds.has(itemId) && remapped.length > 0) {
			keptEntries.push({ itemId, assocs: remapped });
		}
	}

	const payloadSize = keptEntries.reduce(
		(sum, entry) => sum + idSize + 1 + entry.assocs.length * assocSize,
		8,
	);
	const payload = new Uint8Array(payloadSize);
	const outView = new DataView(payload.buffer);
	payload[0] = version;
	payload[1] = (flags >> 16) & 0xff;
	payload[2] = (flags >> 8) & 0xff;
	payload[3] = flags & 0xff;
	outView.setUint32(4, keptEntries.length, false);

	let wp = 8;
	for (const entry of keptEntries) {
		writeUintN(outView, payload, wp, idSize, entry.itemId);
		wp += idSize;
		payload[wp] = entry.assocs.length;
		wp += 1;
		for (const assoc of entry.assocs) {
			if (largeIdx) {
				outView.setUint16(
					wp,
					((assoc.essential & 1) << 15) | (assoc.propIdx & 0x7fff),
					false,
				);
				wp += 2;
			} else {
				payload[wp] = ((assoc.essential & 1) << 7) | (assoc.propIdx & 0x7f);
				wp += 1;
			}
		}
	}

	return wrapBox("ipma", payload);
}

function rebuildIprpBox(
	bytes: Uint8Array,
	iprpBox: IsoBox,
	preserveIcc: boolean,
	strippedIds: Set<number>,
): { bytes: Uint8Array; iccPreserved: boolean } {
	const { boxes: iprpChildren } = readBoxes(
		bytes,
		iprpBox.dataStart,
		iprpBox.end,
	);
	let iccPreserved = false;
	const ipcoBox = iprpChildren.find((c) => c.type === "ipco");
	let indexMap: number[] = [0];
	let rebuiltIpcoBytes: Uint8Array | null = null;

	if (ipcoBox) {
		const { boxes: propBoxes } = readBoxes(
			bytes,
			ipcoBox.dataStart,
			ipcoBox.end,
		);
		indexMap = new Array<number>(propBoxes.length + 1).fill(0);
		const rebuiltProps: Uint8Array[] = [];
		let nextPropIdx = 1;

		for (let i = 0; i < propBoxes.length; i++) {
			const prop = propBoxes[i];
			const isIccColr =
				prop.type === "colr" &&
				prop.dataStart + 4 <= prop.end &&
				(readAscii(bytes, prop.dataStart, 4) === "rICC" ||
					readAscii(bytes, prop.dataStart, 4) === "prof");

			if (isIccColr && !preserveIcc) {
				// Drop ICC colr property cleanly; ipma indices are remapped below
				indexMap[i + 1] = 0;
				continue;
			}
			if (isIccColr) {
				iccPreserved = true;
			}
			rebuiltProps.push(bytes.subarray(prop.start, prop.end));
			indexMap[i + 1] = nextPropIdx++;
		}

		const ipcoTotal = rebuiltProps.reduce((s, p) => s + p.byteLength, 0);
		const ipcoPayload = new Uint8Array(ipcoTotal);
		let pos = 0;
		for (const p of rebuiltProps) {
			ipcoPayload.set(p, pos);
			pos += p.byteLength;
		}
		rebuiltIpcoBytes = wrapBox("ipco", ipcoPayload);
	}

	const rebuiltChildren: Uint8Array[] = [];
	for (const child of iprpChildren) {
		if (child.type === "ipco" && rebuiltIpcoBytes) {
			rebuiltChildren.push(rebuiltIpcoBytes);
		} else if (child.type === "ipma") {
			rebuiltChildren.push(rebuildIpmaBox(bytes, child, indexMap, strippedIds));
		} else {
			rebuiltChildren.push(bytes.subarray(child.start, child.end));
		}
	}

	const total = rebuiltChildren.reduce((s, c) => s + c.byteLength, 0);
	const payload = new Uint8Array(total);
	let pos = 0;
	for (const c of rebuiltChildren) {
		payload.set(c, pos);
		pos += c.byteLength;
	}
	return { bytes: wrapBox("iprp", payload), iccPreserved };
}

export function parseIsobmffMetadata(bytes: Uint8Array): ParseResult {
	const format: ImageFormat = detectImageFormat(bytes);
	const entries: MetadataEntry[] = [];
	const parseWarnings: string[] = [];
	let width: number | null = null;
	let height: number | null = null;
	let hasIccProfile = false;
	let iccProfileName: string | null = null;

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const { boxes: topBoxes, parsedEnd } = readBoxes(bytes, 0, bytes.length);

	for (let bi = 0; bi < topBoxes.length; bi++) {
		const box = topBoxes[bi];
		if (box.type === "uuid" && box.dataStart + 16 <= box.end) {
			const payload = bytes.subarray(box.dataStart + 16, box.end);
			if (matchesUuid(bytes, box.dataStart, XMP_UUID)) {
				entries.push(
					...parseXmpEntries(
						decodeUtf8(payload),
						"uuid (XMP)",
						box.size,
						`iso-${bi}`,
					),
				);
			} else if (matchesUuid(bytes, box.dataStart, C2PA_UUID)) {
				const strings = extractReadableStrings(payload, 4, 10);
				entries.push({
					id: `iso-${bi}-c2pa-uuid`,
					key: "uuid (C2PA / JUMBF Content Credentials)",
					value:
						strings.length > 0
							? strings.join(" · ")
							: `C2PA JUMBF payload (${payload.length.toLocaleString()} bytes)`,
					category: "ai-provenance",
					source: "C2PA (uuid)",
					byteSize: box.size,
					isAiFlag: true,
				});
			}
		} else if (box.type === "jumb" || box.type === "c2pa") {
			const payload = bytes.subarray(box.dataStart, box.end);
			const strings = extractReadableStrings(payload, 4, 10);
			entries.push({
				id: `iso-${bi}-${box.type}`,
				key: `${box.type} (C2PA / JUMBF Content Credentials)`,
				value:
					strings.length > 0
						? strings.join(" · ")
						: `Binary C2PA / JUMBF box (${box.size.toLocaleString()} bytes)`,
				category: "ai-provenance",
				source: box.type,
				byteSize: box.size,
				isAiFlag: true,
			});
		} else if (box.type === "meta" && box.dataStart + 4 <= box.end) {
			const { boxes: metaBoxes } = readBoxes(bytes, box.dataStart + 4, box.end);
			const iinfBox = metaBoxes.find((b) => b.type === "iinf");
			const ilocBox = metaBoxes.find((b) => b.type === "iloc");
			const idatBox = metaBoxes.find((b) => b.type === "idat");
			const iprpBox = metaBoxes.find((b) => b.type === "iprp");

			if (iprpBox) {
				const { boxes: iprpChildren } = readBoxes(
					bytes,
					iprpBox.dataStart,
					iprpBox.end,
				);
				const ipcoBox = iprpChildren.find((b) => b.type === "ipco");
				if (ipcoBox) {
					const { boxes: propBoxes } = readBoxes(
						bytes,
						ipcoBox.dataStart,
						ipcoBox.end,
					);
					for (let pi = 0; pi < propBoxes.length; pi++) {
						const prop = propBoxes[pi];
						if (prop.type === "ispe" && prop.dataStart + 12 <= prop.end) {
							const w = view.getUint32(prop.dataStart + 4, false);
							const h = view.getUint32(prop.dataStart + 8, false);
							if (width === null || height === null || w * h > width * height) {
								width = w;
								height = h;
							}
						} else if (prop.type === "colr" && prop.dataStart + 4 <= prop.end) {
							const colorType = readAscii(bytes, prop.dataStart, 4);
							if (colorType === "rICC" || colorType === "prof") {
								hasIccProfile = true;
								const iccData = bytes.subarray(prop.dataStart + 4, prop.end);
								iccProfileName = extractIccProfileName(iccData);
								entries.push({
									id: `iso-colr-${pi}`,
									key: `ICC Profile: ${iccProfileName ?? "Embedded Color Profile"}`,
									value: `Color profile (${iccData.byteLength.toLocaleString()} bytes) — preserved by default in Lossless mode`,
									category: "icc",
									source: `colr (${colorType})`,
									byteSize: prop.size,
									isAiFlag: false,
									isPreservedByDefault: true,
								});
							}
						}
					}
				}
			}

			if (iinfBox && ilocBox) {
				const infeItems = parseIinfBox(bytes, iinfBox);
				const ilocTable = parseIlocBox(bytes, ilocBox);
				if (ilocTable) {
					const ilocMap = new Map<number, IlocItem>();
					for (const item of ilocTable.items) {
						ilocMap.set(item.itemId, item);
					}

					for (const infe of infeItems) {
						const kind = classifyInfeMetadata(infe);
						if (!kind) continue;
						const ilocItem = ilocMap.get(infe.itemId);
						const itemBytes = readItemBytes(bytes, ilocItem, idatBox);
						if (!itemBytes) continue;

						if (kind === "exif") {
							let exifSlice = itemBytes;
							if (itemBytes.length >= 4) {
								const tiffHeaderOffset = new DataView(
									itemBytes.buffer,
									itemBytes.byteOffset,
									itemBytes.byteLength,
								).getUint32(0, false);
								if (4 + tiffHeaderOffset < itemBytes.length) {
									exifSlice = itemBytes.subarray(4 + tiffHeaderOffset);
								}
							}
							entries.push(
								...parseExifEntries(
									exifSlice,
									`Exif (item #${infe.itemId})`,
									`iso-item-${infe.itemId}`,
								),
							);
						} else if (kind === "xmp") {
							entries.push(
								...parseXmpEntries(
									decodeUtf8(itemBytes),
									`XMP (item #${infe.itemId})`,
									itemBytes.byteLength,
									`iso-item-${infe.itemId}`,
								),
							);
						} else if (kind === "c2pa") {
							const strings = extractReadableStrings(itemBytes, 4, 10);
							entries.push({
								id: `iso-item-${infe.itemId}-c2pa`,
								key: `${infe.itemType} (C2PA / JUMBF Content Credentials)`,
								value:
									strings.length > 0
										? strings.join(" · ")
										: `Binary C2PA / JUMBF item (${itemBytes.byteLength.toLocaleString()} bytes)`,
								category: "ai-provenance",
								source: `${infe.itemType} (#${infe.itemId})`,
								byteSize: itemBytes.byteLength,
								isAiFlag: true,
							});
						}
					}
				}
			}
		}
	}

	if (parsedEnd < bytes.length) {
		const trailingSize = bytes.length - parsedEnd;
		const trailingBytes = bytes.subarray(parsedEnd);
		const strings = extractReadableStrings(trailingBytes, 4, 6);
		const summary =
			strings.length > 0
				? `${trailingSize.toLocaleString()} bytes after container (${strings.join(" · ")})`
				: `${trailingSize.toLocaleString()} trailing bytes after container`;
		const aiFlag = hasAiSignal("trailing", summary);
		entries.push({
			id: "iso-trailing",
			key: "Trailing Bytes After Container",
			value: summary,
			category: aiFlag ? "ai-provenance" : "trailing",
			source: "Post-ISOBMFF",
			byteSize: trailingSize,
			isAiFlag: aiFlag,
		});
	}

	const { aiFlagCount, strippableCount } = summarizeEntries(entries);
	return {
		format,
		mimeType: formatToMime(format),
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

export function stripIsobmffLossless(
	bytes: Uint8Array,
	preserveIcc: boolean,
	stripScope: StripScope = "all",
): StripResult {
	const working = new Uint8Array(bytes);
	const { boxes: topBoxes, parsedEnd } = readBoxes(working, 0, working.length);
	const removedSegments: string[] = [];
	let iccPreserved = false;

	const strippedItemIds = new Set<number>();
	let ilocTable: IlocTable | null = null;
	let iinfBoxRef: IsoBox | undefined;
	let ilocBoxRef: IsoBox | undefined;
	let idatBoxRef: IsoBox | undefined;
	let metaBoxRef: IsoBox | undefined;

	// Locate meta sub-boxes and identify targeted metadata items
	for (const box of topBoxes) {
		if (box.type === "meta" && box.dataStart + 4 <= box.end) {
			metaBoxRef = box;
			const { boxes: metaBoxes } = readBoxes(
				working,
				box.dataStart + 4,
				box.end,
			);
			iinfBoxRef = metaBoxes.find((b) => b.type === "iinf");
			ilocBoxRef = metaBoxes.find((b) => b.type === "iloc");
			idatBoxRef = metaBoxes.find((b) => b.type === "idat");

			if (iinfBoxRef && ilocBoxRef) {
				const infeItems = parseIinfBox(working, iinfBoxRef);
				ilocTable = parseIlocBox(working, ilocBoxRef);
				if (ilocTable) {
					const ilocMap = new Map<number, IlocItem>();
					for (const item of ilocTable.items) {
						ilocMap.set(item.itemId, item);
					}

					for (const infe of infeItems) {
						const kind = classifyInfeMetadata(infe);
						if (!kind) continue;

						let shouldStrip = false;
						if (stripScope === "all") {
							shouldStrip = true;
						} else if (kind === "c2pa") {
							shouldStrip = true;
						} else if (kind === "xmp") {
							const itemBytes = readItemBytes(
								working,
								ilocMap.get(infe.itemId),
								idatBoxRef,
							);
							if (itemBytes && hasAiSignal("XMP", decodeUtf8(itemBytes))) {
								shouldStrip = true;
							}
						} else if (kind === "exif") {
							const itemBytes = readItemBytes(
								working,
								ilocMap.get(infe.itemId),
								idatBoxRef,
							);
							if (itemBytes) {
								let exifSlice = itemBytes;
								if (itemBytes.length >= 4) {
									const tiffHeaderOffset = new DataView(
										itemBytes.buffer,
										itemBytes.byteOffset,
										itemBytes.byteLength,
									).getUint32(0, false);
									if (4 + tiffHeaderOffset < itemBytes.length) {
										exifSlice = itemBytes.subarray(4 + tiffHeaderOffset);
									}
								}
								if (
									parseExifEntries(exifSlice, "Exif", "chk").some(
										(e) => e.isAiFlag,
									)
								) {
									shouldStrip = true;
								}
							}
						}

						if (shouldStrip) {
							strippedItemIds.add(infe.itemId);
							removedSegments.push(kind.toUpperCase());
							// Zero-wipe metadata payload inside mdat/idat so zero metadata bytes remain on disk
							const ilocItem = ilocMap.get(infe.itemId);
							if (ilocItem && ilocItem.constructionMethod !== 2) {
								for (const ext of ilocItem.extents) {
									if (ext.extentLength === 0) continue;
									const start =
										ilocItem.constructionMethod === 1 && idatBoxRef
											? idatBoxRef.dataStart +
												ilocItem.baseOffset +
												ext.extentOffset
											: ilocItem.baseOffset + ext.extentOffset;
									const end = start + ext.extentLength;
									if (start >= 0 && end <= working.length) {
										working.fill(0, start, end);
									}
								}
							}
						}
					}
				}
			}
			break;
		}
	}

	// Build initial meta (to fix meta byte size before calculating mdat shifts)
	function buildRebuiltMeta(
		shiftLookup?: (absOffset: number) => number,
	): Uint8Array | null {
		if (!metaBoxRef) return null;
		const { boxes: metaBoxes } = readBoxes(
			working,
			metaBoxRef.dataStart + 4,
			metaBoxRef.end,
		);
		const children: Uint8Array[] = [];

		for (const sub of metaBoxes) {
			if (sub.type === "iinf" && iinfBoxRef) {
				const infeItems = parseIinfBox(working, iinfBoxRef);
				const keptInfe = infeItems.filter(
					(it) => !strippedItemIds.has(it.itemId),
				);
				children.push(buildIinfBox(working, iinfBoxRef, keptInfe));
			} else if (sub.type === "iloc" && ilocTable) {
				const currentIloc = ilocTable;
				const keptIloc: IlocItem[] = currentIloc.items
					.filter((it) => !strippedItemIds.has(it.itemId))
					.map((it) => {
						if (it.constructionMethod !== 0 || !shiftLookup) {
							return it;
						}
						if (it.extents.length === 0) {
							return it;
						}
						const deltas = it.extents.map((ext) =>
							shiftLookup(it.baseOffset + ext.extentOffset),
						);
						const firstDelta = deltas[0];
						const allSameDelta = deltas.every((d) => d === firstDelta);
						if (
							currentIloc.baseOffsetSize > 0 &&
							allSameDelta &&
							(currentIloc.offsetSize === 0 ||
								(it.baseOffset > 0 && it.baseOffset + firstDelta >= 0))
						) {
							return {
								...it,
								baseOffset: Math.max(0, it.baseOffset + firstDelta),
							};
						}
						return {
							...it,
							extents: it.extents.map((ext, idx) => ({
								...ext,
								extentOffset: Math.max(0, ext.extentOffset + deltas[idx]),
							})),
						};
					});
				children.push(buildIlocBox(currentIloc, keptIloc));
			} else if (sub.type === "iref") {
				const rebuiltIref = rebuildIrefBox(working, sub, strippedItemIds);
				if (rebuiltIref) children.push(rebuiltIref);
			} else if (sub.type === "iprp") {
				const rebuiltIprp = rebuildIprpBox(
					working,
					sub,
					preserveIcc,
					strippedItemIds,
				);
				iccPreserved = rebuiltIprp.iccPreserved;
				children.push(rebuiltIprp.bytes);
			} else {
				children.push(working.subarray(sub.start, sub.end));
			}
		}

		const totalPayload = 4 + children.reduce((s, c) => s + c.byteLength, 0);
		const payload = new Uint8Array(totalPayload);
		payload.set(
			working.subarray(metaBoxRef.dataStart, metaBoxRef.dataStart + 4),
			0,
		);
		let pos = 4;
		for (const c of children) {
			payload.set(c, pos);
			pos += c.byteLength;
		}
		return wrapBox("meta", payload);
	}

	// Pass 1: Determine exact new sizes of all kept top-level boxes
	const metaPass1 = buildRebuiltMeta();

	interface TopOutputPlan {
		oldStart: number;
		oldEnd: number;
		newStart: number;
		bytes: Uint8Array;
		isMeta: boolean;
	}

	const keptPlan: TopOutputPlan[] = [];
	let writeCursor = 0;

	for (const box of topBoxes) {
		let dropBox = false;
		if (box.type === "uuid" && box.dataStart + 16 <= box.end) {
			if (matchesUuid(working, box.dataStart, C2PA_UUID)) {
				dropBox = true;
				removedSegments.push("C2PA(uuid)");
			} else if (matchesUuid(working, box.dataStart, XMP_UUID)) {
				const xmpText = decodeUtf8(
					working.subarray(box.dataStart + 16, box.end),
				);
				if (stripScope === "all" || hasAiSignal("XMP", xmpText)) {
					dropBox = true;
					removedSegments.push("XMP(uuid)");
				}
			}
		} else if (box.type === "jumb" || box.type === "c2pa") {
			dropBox = true;
			removedSegments.push(box.type);
		}

		if (dropBox) continue;

		const isMeta = box === metaBoxRef && metaPass1 !== null;
		const boxBytes =
			isMeta && metaPass1 !== null
				? metaPass1
				: working.subarray(box.start, box.end);

		keptPlan.push({
			oldStart: box.start,
			oldEnd: box.end,
			newStart: writeCursor,
			bytes: boxBytes,
			isMeta,
		});
		writeCursor += boxBytes.byteLength;
	}

	if (parsedEnd < working.length) {
		const trailingBytes = working.subarray(parsedEnd);
		const strings = extractReadableStrings(trailingBytes, 4, 6);
		if (stripScope === "all" || hasAiSignal("trailing", strings.join(" "))) {
			removedSegments.push(`Trailing(${working.length - parsedEnd}B)`);
		} else {
			keptPlan.push({
				oldStart: parsedEnd,
				oldEnd: working.length,
				newStart: writeCursor,
				bytes: trailingBytes,
				isMeta: false,
			});
			writeCursor += trailingBytes.byteLength;
		}
	}

	// Pass 2: Rewrite meta's iloc offsets using exact top-level shift deltas (identical meta byte length!)
	const shiftLookup = (absOffset: number): number => {
		for (const item of keptPlan) {
			if (absOffset >= item.oldStart && absOffset < item.oldEnd) {
				return item.newStart - item.oldStart;
			}
		}
		return 0;
	};

	const metaPass2 = buildRebuiltMeta(shiftLookup);
	if (metaPass2) {
		for (const item of keptPlan) {
			if (item.isMeta) {
				item.bytes = metaPass2;
				break;
			}
		}
	}

	const output = new Uint8Array(writeCursor);
	let pos = 0;
	for (const item of keptPlan) {
		output.set(item.bytes, pos);
		pos += item.bytes.byteLength;
	}

	return {
		bytes: output,
		removedSegments,
		iccPreserved,
	};
}
