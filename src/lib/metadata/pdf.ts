import type {
	CleanResult,
	MetadataCategory,
	MetadataEntry,
	ParseResult,
	StripResult,
	StripScope,
} from "./types";
import {
	decodeUtf8,
	hasAiSignal,
	parseXmpEntries,
	sanitizeDisplayText,
	summarizeEntries,
} from "./utils";

function formatPdfDate(raw: string): string {
	const match = raw.match(
		/^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(Z|[+-]\d{2}'?\d{2}'?)?$/,
	);
	if (!match) return raw;
	const [, y, mo = "01", d = "01", h, mi, s, tz] = match;
	if (!h) return `${y}-${mo}-${d}`;
	const time = `${h}:${mi ?? "00"}:${s ?? "00"}`;
	const normTz = tz ? tz.replace(/'/g, ":").replace(/:$/, "") : "";
	return `${y}-${mo}-${d} ${time}${normTz ? ` ${normTz}` : ""}`;
}

function isEncryptedPdfError(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	return /encrypt|password/i.test(err.message);
}

async function loadPdfLib() {
	return import("pdf-lib");
}

function decodePdfValue(
	value: unknown,
	pdfLib: Awaited<ReturnType<typeof loadPdfLib>>,
): string | null {
	if (
		value instanceof pdfLib.PDFString ||
		value instanceof pdfLib.PDFHexString
	) {
		return value.decodeText();
	}
	if (value instanceof pdfLib.PDFName) {
		return value.decodeText();
	}
	if (value instanceof pdfLib.PDFNumber || value instanceof pdfLib.PDFBool) {
		return value.toString();
	}
	return null;
}

function readStreamBytes(
	streamObj: unknown,
	pdfLib: Awaited<ReturnType<typeof loadPdfLib>>,
): Uint8Array | null {
	if (streamObj instanceof pdfLib.PDFRawStream) {
		try {
			return pdfLib.decodePDFRawStream(streamObj).decode();
		} catch {
			return streamObj.contents;
		}
	}
	if (streamObj instanceof pdfLib.PDFStream) {
		try {
			return streamObj.getContents();
		} catch {
			return null;
		}
	}
	return null;
}

export async function parsePdfMetadata(
	bytes: Uint8Array,
): Promise<ParseResult> {
	const pdfLib = await loadPdfLib();
	let pdfDoc: Awaited<ReturnType<typeof pdfLib.PDFDocument.load>>;
	try {
		pdfDoc = await pdfLib.PDFDocument.load(bytes, {
			updateMetadata: false,
			ignoreEncryption: false,
		});
	} catch (err) {
		if (isEncryptedPdfError(err)) {
			throw new Error(
				"This PDF is password-protected or encrypted. Unlock it before inspecting or removing metadata.",
			);
		}
		throw new Error(
			"Could not parse this PDF file. Make sure it is a valid, uncorrupted PDF document.",
		);
	}

	const entries: MetadataEntry[] = [];
	const parseWarnings: string[] = [];
	const pageCount = pdfDoc.getPageCount();
	let entryIdx = 0;

	// 1. Document Info Dictionary (/Info)
	const infoRef = pdfDoc.context.trailerInfo.Info;
	const infoDict = infoRef
		? pdfDoc.context.lookupMaybe(infoRef, pdfLib.PDFDict)
		: undefined;

	if (infoDict) {
		for (const [keyObj, rawVal] of infoDict.entries()) {
			const keyName = keyObj.decodeText();
			const resolved = pdfDoc.context.lookup(rawVal);
			const decoded = decodePdfValue(resolved, pdfLib);
			if (decoded === null) continue;
			const trimmed = decoded.trim();
			if (!trimmed) continue;

			const isDateField = /date$/i.test(keyName);
			const displayVal = sanitizeDisplayText(
				isDateField ? formatPdfDate(trimmed) : trimmed,
			);
			const aiFlag = hasAiSignal(keyName, displayVal);
			const category: MetadataCategory = aiFlag
				? "ai-provenance"
				: isDateField
					? "timestamp"
					: "document";

			entries.push({
				id: `pdf-info-${entryIdx++}`,
				key: `PDF Info: ${keyName}`,
				value: displayVal,
				category,
				source: "PDF /Info",
				byteSize: new TextEncoder().encode(`${keyName}:${trimmed}`).byteLength,
				isAiFlag: aiFlag,
			});
		}
	}

	// 2. Catalog XMP Metadata Stream (/Metadata)
	const metadataName = pdfLib.PDFName.of("Metadata");
	const catalogMetaRef = pdfDoc.catalog.get(metadataName);
	if (catalogMetaRef) {
		const metaStream = pdfDoc.context.lookup(catalogMetaRef);
		const streamBytes = readStreamBytes(metaStream, pdfLib);
		if (streamBytes && streamBytes.byteLength > 0) {
			const xmlText = decodeUtf8(streamBytes).trim();
			if (xmlText.length > 0) {
				const xmpEntries = parseXmpEntries(
					xmlText,
					"PDF /Metadata (XMP)",
					streamBytes.byteLength,
					"pdf-catalog",
				);
				entries.push(...xmpEntries);
			}
		}
	}

	// 3. Catalog Application Private Data (/PieceInfo)
	const pieceInfoName = pdfLib.PDFName.of("PieceInfo");
	const catalogPieceInfo = pdfDoc.catalog.get(pieceInfoName);
	if (catalogPieceInfo) {
		const pieceDict = pdfDoc.context.lookupMaybe(
			catalogPieceInfo,
			pdfLib.PDFDict,
		);
		const appKeys = pieceDict
			? pieceDict.keys().map((k) => k.decodeText())
			: [];
		const value =
			appKeys.length > 0
				? `Private application metadata (${appKeys.join(", ")})`
				: "Private application data block (/PieceInfo)";
		const aiFlag = hasAiSignal("PieceInfo", value);
		entries.push({
			id: `pdf-pieceinfo-${entryIdx++}`,
			key: "PDF Catalog: PieceInfo",
			value,
			category: aiFlag ? "ai-provenance" : "document",
			source: "PDF /PieceInfo",
			byteSize: Math.max(32, value.length),
			isAiFlag: aiFlag,
		});
	}

	// 4. Page-level /Metadata and /PieceInfo streams
	const pages = pdfDoc.getPages();
	for (let i = 0; i < pages.length; i++) {
		const page = pages[i];
		const pageMetaRef = page.node.get(metadataName);
		if (pageMetaRef) {
			const pageMetaStream = pdfDoc.context.lookup(pageMetaRef);
			const streamBytes = readStreamBytes(pageMetaStream, pdfLib);
			if (streamBytes && streamBytes.byteLength > 0) {
				const xmlText = decodeUtf8(streamBytes).trim();
				if (xmlText.length > 0) {
					entries.push(
						...parseXmpEntries(
							xmlText,
							`PDF Page ${i + 1} /Metadata`,
							streamBytes.byteLength,
							`pdf-p${i + 1}`,
						),
					);
				}
			}
		}
		if (page.node.get(pieceInfoName)) {
			entries.push({
				id: `pdf-p${i + 1}-pieceinfo-${entryIdx++}`,
				key: `PDF Page ${i + 1}: PieceInfo`,
				value: "Private application data attached to page",
				category: "document",
				source: `PDF Page ${i + 1}`,
				byteSize: 32,
				isAiFlag: false,
			});
		}
	}

	const { aiFlagCount, strippableCount } = summarizeEntries(entries);
	const firstPage = pages[0];
	const pageSize = firstPage ? firstPage.getSize() : null;

	return {
		format: "pdf",
		mimeType: "application/pdf",
		width: pageSize ? Math.round(pageSize.width) : null,
		height: pageSize ? Math.round(pageSize.height) : null,
		pageCount,
		byteLength: bytes.byteLength,
		hasIccProfile: false,
		iccProfileName: null,
		entries,
		aiFlagCount,
		strippableCount,
		parseWarnings,
	};
}

export async function stripPdfLossless(
	bytes: Uint8Array,
	stripScope: StripScope = "all",
): Promise<StripResult> {
	const pdfLib = await loadPdfLib();
	let pdfDoc: Awaited<ReturnType<typeof pdfLib.PDFDocument.load>>;
	try {
		pdfDoc = await pdfLib.PDFDocument.load(bytes, {
			updateMetadata: false,
			ignoreEncryption: false,
		});
	} catch (err) {
		if (isEncryptedPdfError(err)) {
			throw new Error(
				"This PDF is password-protected or encrypted. Unlock it before removing metadata.",
			);
		}
		throw new Error("Could not parse this PDF file for metadata cleaning.");
	}

	const removedSegments: string[] = [];
	const metadataName = pdfLib.PDFName.of("Metadata");
	const pieceInfoName = pdfLib.PDFName.of("PieceInfo");

	// 1. Clean Document /Info dictionary
	const infoRef = pdfDoc.context.trailerInfo.Info;
	if (infoRef) {
		if (stripScope === "all") {
			delete pdfDoc.context.trailerInfo.Info;
			if (infoRef instanceof pdfLib.PDFRef) {
				pdfDoc.context.delete(infoRef);
			}
			removedSegments.push("PDF /Info Dictionary");
		} else {
			const infoDict = pdfDoc.context.lookupMaybe(infoRef, pdfLib.PDFDict);
			if (infoDict) {
				let removedAny = false;
				for (const [keyObj, rawVal] of infoDict.entries()) {
					const keyName = keyObj.decodeText();
					const resolved = pdfDoc.context.lookup(rawVal);
					const decoded = decodePdfValue(resolved, pdfLib) ?? "";
					if (hasAiSignal(keyName, decoded)) {
						infoDict.delete(keyObj);
						removedAny = true;
					}
				}
				if (removedAny) {
					removedSegments.push("PDF /Info AI Fields");
				}
				if (infoDict.entries().length === 0) {
					delete pdfDoc.context.trailerInfo.Info;
					if (infoRef instanceof pdfLib.PDFRef) {
						pdfDoc.context.delete(infoRef);
					}
				}
			}
		}
	}

	// 2. Clean Catalog /Metadata XMP stream
	const catalogMetaRef = pdfDoc.catalog.get(metadataName);
	if (catalogMetaRef) {
		let shouldRemove = stripScope === "all";
		if (!shouldRemove) {
			const metaStream = pdfDoc.context.lookup(catalogMetaRef);
			const streamBytes = readStreamBytes(metaStream, pdfLib);
			if (streamBytes) {
				shouldRemove = hasAiSignal("XMP", decodeUtf8(streamBytes));
			}
		}
		if (shouldRemove) {
			pdfDoc.catalog.delete(metadataName);
			if (catalogMetaRef instanceof pdfLib.PDFRef) {
				pdfDoc.context.delete(catalogMetaRef);
			}
			removedSegments.push("PDF Catalog XMP (/Metadata)");
		}
	}

	// 3. Clean Catalog /PieceInfo
	const catalogPieceRef = pdfDoc.catalog.get(pieceInfoName);
	if (catalogPieceRef && stripScope === "all") {
		pdfDoc.catalog.delete(pieceInfoName);
		if (catalogPieceRef instanceof pdfLib.PDFRef) {
			pdfDoc.context.delete(catalogPieceRef);
		}
		removedSegments.push("PDF Catalog /PieceInfo");
	}

	// 4. Clean per-page /Metadata and /PieceInfo
	const pages = pdfDoc.getPages();
	let removedPageMeta = 0;
	for (const page of pages) {
		const pageMetaRef = page.node.get(metadataName);
		if (pageMetaRef) {
			let shouldRemove = stripScope === "all";
			if (!shouldRemove) {
				const metaStream = pdfDoc.context.lookup(pageMetaRef);
				const streamBytes = readStreamBytes(metaStream, pdfLib);
				if (streamBytes) {
					shouldRemove = hasAiSignal("XMP", decodeUtf8(streamBytes));
				}
			}
			if (shouldRemove) {
				page.node.delete(metadataName);
				if (pageMetaRef instanceof pdfLib.PDFRef) {
					pdfDoc.context.delete(pageMetaRef);
				}
				removedPageMeta++;
			}
		}

		const pagePieceRef = page.node.get(pieceInfoName);
		if (pagePieceRef && stripScope === "all") {
			page.node.delete(pieceInfoName);
			if (pagePieceRef instanceof pdfLib.PDFRef) {
				pdfDoc.context.delete(pagePieceRef);
			}
			removedPageMeta++;
		}
	}
	if (removedPageMeta > 0) {
		removedSegments.push(`PDF Page Metadata (${removedPageMeta})`);
	}

	const savedBytes = await pdfDoc.save({
		useObjectStreams: true,
		updateFieldAppearances: false,
	});

	return {
		bytes: savedBytes,
		removedSegments,
		iccPreserved: true,
	};
}

export async function cleanPdfBuffer(
	buffer: ArrayBuffer,
	stripScope: StripScope = "all",
): Promise<CleanResult> {
	const bytes = new Uint8Array(buffer);
	const stripResult = await stripPdfLossless(bytes, stripScope);
	const cleanedBuffer = stripResult.bytes.buffer.slice(
		stripResult.bytes.byteOffset,
		stripResult.bytes.byteOffset + stripResult.bytes.byteLength,
	) as ArrayBuffer;
	const verification = await parsePdfMetadata(new Uint8Array(cleanedBuffer));

	return {
		cleanedBuffer,
		outputMimeType: "application/pdf",
		outputExtension: "pdf",
		modeUsed: "lossless",
		stripScope,
		originalSize: buffer.byteLength,
		cleanedSize: cleanedBuffer.byteLength,
		iccPreserved: true,
		removedSegments: stripResult.removedSegments,
		verification,
	};
}
