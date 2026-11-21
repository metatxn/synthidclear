import { crc32 } from "#/lib/metadata/utils";

export interface ZipInputFile {
	name: string;
	data: Uint8Array;
}

const textEncoder = new TextEncoder();

function deduplicateFilename(name: string, used: Set<string>): string {
	if (!used.has(name)) {
		used.add(name);
		return name;
	}
	const dot = name.lastIndexOf(".");
	const base = dot > 0 ? name.slice(0, dot) : name;
	const ext = dot > 0 ? name.slice(dot) : "";
	let counter = 2;
	while (used.has(`${base} (${counter})${ext}`)) {
		counter++;
	}
	const unique = `${base} (${counter})${ext}`;
	used.add(unique);
	return unique;
}

function getDosDateTime(date: Date): { dosTime: number; dosDate: number } {
	const year = Math.max(1980, date.getFullYear());
	const dosDate =
		((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
	const dosTime =
		(date.getHours() << 11) |
		(date.getMinutes() << 5) |
		(date.getSeconds() >> 1);
	return { dosTime, dosDate };
}

/**
 * Builds a standard uncompressed PKZIP (STORE method 0) archive in pure TypeScript.
 * Images (PNG/JPEG/WebP/HEIC/AVIF) are already entropy-compressed, so STORE is
 * instantaneous, zero-CPU, and avoids inflating file size.
 */
export function createZipBlob(files: readonly ZipInputFile[]): Blob {
	const usedNames = new Set<string>();
	const { dosTime, dosDate } = getDosDateTime(new Date());

	interface PreparedEntry {
		nameBytes: Uint8Array;
		data: Uint8Array;
		crc: number;
		localHeaderOffset: number;
	}

	const entries: PreparedEntry[] = [];
	let localSectionSize = 0;
	let centralDirectorySize = 0;

	for (const file of files) {
		const uniqueName = deduplicateFilename(file.name, usedNames);
		const nameBytes = textEncoder.encode(uniqueName);
		const crc = crc32(file.data);
		entries.push({
			nameBytes,
			data: file.data,
			crc,
			localHeaderOffset: localSectionSize,
		});
		localSectionSize += 30 + nameBytes.length + file.data.length;
		centralDirectorySize += 46 + nameBytes.length;
	}

	const totalSize = localSectionSize + centralDirectorySize + 22;
	const out = new Uint8Array(totalSize);
	const view = new DataView(out.buffer);
	let pos = 0;

	// 1. Local File Headers + Payloads
	for (const entry of entries) {
		view.setUint32(pos, 0x04034b50, true); // Local file header signature
		view.setUint16(pos + 4, 20, true); // Version needed to extract (2.0)
		view.setUint16(pos + 6, 0x0800, true); // General purpose flag: UTF-8 filenames
		view.setUint16(pos + 8, 0, true); // Compression method: 0 (STORE)
		view.setUint16(pos + 10, dosTime, true);
		view.setUint16(pos + 12, dosDate, true);
		view.setUint32(pos + 14, entry.crc, true);
		view.setUint32(pos + 18, entry.data.length, true); // Compressed size
		view.setUint32(pos + 22, entry.data.length, true); // Uncompressed size
		view.setUint16(pos + 26, entry.nameBytes.length, true);
		view.setUint16(pos + 28, 0, true); // Extra field length
		pos += 30;

		out.set(entry.nameBytes, pos);
		pos += entry.nameBytes.length;
		out.set(entry.data, pos);
		pos += entry.data.length;
	}

	const centralDirOffset = pos;

	// 2. Central Directory File Headers
	for (const entry of entries) {
		view.setUint32(pos, 0x02014b50, true); // Central directory signature
		view.setUint16(pos + 4, 20, true); // Version made by
		view.setUint16(pos + 6, 20, true); // Version needed
		view.setUint16(pos + 8, 0x0800, true); // UTF-8 filename flag
		view.setUint16(pos + 10, 0, true); // STORE
		view.setUint16(pos + 12, dosTime, true);
		view.setUint16(pos + 14, dosDate, true);
		view.setUint32(pos + 16, entry.crc, true);
		view.setUint32(pos + 20, entry.data.length, true);
		view.setUint32(pos + 24, entry.data.length, true);
		view.setUint16(pos + 28, entry.nameBytes.length, true);
		view.setUint16(pos + 30, 0, true); // Extra length
		view.setUint16(pos + 32, 0, true); // File comment length
		view.setUint16(pos + 34, 0, true); // Disk number start
		view.setUint16(pos + 36, 0, true); // Internal attributes
		view.setUint32(pos + 38, 0, true); // External attributes
		view.setUint32(pos + 42, entry.localHeaderOffset, true);
		pos += 46;

		out.set(entry.nameBytes, pos);
		pos += entry.nameBytes.length;
	}

	// 3. End of Central Directory Record (EOCD)
	view.setUint32(pos, 0x06054b50, true);
	view.setUint16(pos + 4, 0, true); // Disk number
	view.setUint16(pos + 6, 0, true); // Central dir start disk
	view.setUint16(pos + 8, entries.length, true); // Entries on disk
	view.setUint16(pos + 10, entries.length, true); // Total entries
	view.setUint32(pos + 12, centralDirectorySize, true);
	view.setUint32(pos + 16, centralDirOffset, true);
	view.setUint16(pos + 20, 0, true); // ZIP comment length

	return new Blob([out], { type: "application/zip" });
}
