import { crc32 } from "./utils";

const textEncoder = new TextEncoder();

function buildPngChunk(type: string, data: Uint8Array): Uint8Array {
	const chunk = new Uint8Array(12 + data.byteLength);
	const view = new DataView(chunk.buffer);
	view.setUint32(0, data.byteLength, false);
	for (let i = 0; i < 4; i++) {
		chunk[4 + i] = type.charCodeAt(i);
	}
	chunk.set(data, 8);
	const crcInput = chunk.subarray(4, 8 + data.byteLength);
	view.setUint32(8 + data.byteLength, crc32(crcInput), false);
	return chunk;
}

function buildTextChunk(keyword: string, text: string): Uint8Array {
	const keyBytes = textEncoder.encode(keyword);
	const valBytes = textEncoder.encode(text);
	const payload = new Uint8Array(keyBytes.length + 1 + valBytes.length);
	payload.set(keyBytes, 0);
	payload[keyBytes.length] = 0;
	payload.set(valBytes, keyBytes.length + 1);
	return buildPngChunk("tEXt", payload);
}

function buildItxtChunk(keyword: string, text: string): Uint8Array {
	const keyBytes = textEncoder.encode(keyword);
	const valBytes = textEncoder.encode(text);
	// keyword \0 compressionFlag(0) compressionMethod(0) lang \0 translated \0 text
	const payload = new Uint8Array(keyBytes.length + 5 + valBytes.length);
	payload.set(keyBytes, 0);
	payload[keyBytes.length] = 0;
	payload[keyBytes.length + 1] = 0;
	payload[keyBytes.length + 2] = 0;
	payload[keyBytes.length + 3] = 0;
	payload[keyBytes.length + 4] = 0;
	payload.set(valBytes, keyBytes.length + 5);
	return buildPngChunk("iTXt", payload);
}

function buildSampleExifPayload(): Uint8Array {
	// Minimal valid little-endian TIFF header + IFD0 (Make, Model, Software, DateTime)
	const entries: Array<{ tag: number; value: string }> = [
		{ tag: 0x010f, value: "SynthIDClear Virtual Studio\0" },
		{ tag: 0x0110, value: "Diffusion Pipeline v2.4\0" },
		{ tag: 0x0131, value: "ComfyUI / Flux.1-dev\0" },
		{ tag: 0x0132, value: "2026:11:21 12:30:00\0" },
	];

	const headerSize = 8;
	const ifdSize = 2 + entries.length * 12 + 4;
	const dataStart = headerSize + ifdSize;
	const encodedValues = entries.map((e) => textEncoder.encode(e.value));
	const valuesTotal = encodedValues.reduce((sum, b) => sum + b.length, 0);

	const buf = new Uint8Array(dataStart + valuesTotal);
	const view = new DataView(buf.buffer);

	// TIFF header: "II", 42, offset to IFD0 = 8
	buf[0] = 0x49;
	buf[1] = 0x49;
	view.setUint16(2, 42, true);
	view.setUint32(4, 8, true);

	// IFD0 entry count
	view.setUint16(8, entries.length, true);

	let valueOffset = dataStart;
	for (let i = 0; i < entries.length; i++) {
		const entryPos = 10 + i * 12;
		const valBytes = encodedValues[i];
		view.setUint16(entryPos, entries[i].tag, true);
		view.setUint16(entryPos + 2, 2, true); // ASCII
		view.setUint32(entryPos + 4, valBytes.length, true);
		if (valBytes.length <= 4) {
			buf.set(valBytes, entryPos + 8);
		} else {
			view.setUint32(entryPos + 8, valueOffset, true);
			buf.set(valBytes, valueOffset);
			valueOffset += valBytes.length;
		}
	}
	// Next IFD offset = 0
	view.setUint32(10 + entries.length * 12, 0, true);
	return buf;
}

function buildTimeChunk(): Uint8Array {
	const now = new Date();
	const payload = new Uint8Array(7);
	const view = new DataView(payload.buffer);
	view.setUint16(0, now.getUTCFullYear(), false);
	payload[2] = now.getUTCMonth() + 1;
	payload[3] = now.getUTCDate();
	payload[4] = now.getUTCHours();
	payload[5] = now.getUTCMinutes();
	payload[6] = now.getUTCSeconds();
	return buildPngChunk("tIME", payload);
}

function buildC2paCabxChunk(): Uint8Array {
	const manifestText = [
		"jumb",
		"c2pa",
		"c2pa.manifest.store",
		"c2pa.assertions",
		"c2pa.actions",
		"action:c2pa.created",
		"digitalSourceType:http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
		"softwareAgent:Synthetic Studio Generator 2.0",
		"c2pa.signature",
	].join("\0");
	const payload = textEncoder.encode(manifestText);
	return buildPngChunk("caBX", payload);
}

function buildSampleXmpXml(): string {
	return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:iptcExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmp:CreatorTool="SynthIDClear Demo AI Generator v2.4"
      xmp:CreateDate="2026-11-21T12:30:00Z"
      iptcExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia">
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">Sample AI-generated image containing embedded C2PA, XMP DigitalSourceType, EXIF, and Stable Diffusion prompt chunks.</rdf:li>
        </rdf:Alt>
      </dc:description>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

async function createBasePngBytes(): Promise<Uint8Array> {
	const width = 640;
	const height = 400;

	if (typeof document !== "undefined") {
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			const grad = ctx.createLinearGradient(0, 0, width, height);
			grad.addColorStop(0, "#0b132b");
			grad.addColorStop(0.5, "#115e59");
			grad.addColorStop(1, "#0f172a");
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, width, height);

			// Soft studio glow orbs
			const orb1 = ctx.createRadialGradient(160, 120, 10, 160, 120, 190);
			orb1.addColorStop(0, "rgba(45, 212, 191, 0.45)");
			orb1.addColorStop(1, "rgba(45, 212, 191, 0)");
			ctx.fillStyle = orb1;
			ctx.fillRect(0, 0, width, height);

			const orb2 = ctx.createRadialGradient(500, 300, 10, 500, 300, 210);
			orb2.addColorStop(0, "rgba(251, 191, 36, 0.3)");
			orb2.addColorStop(1, "rgba(251, 191, 36, 0)");
			ctx.fillStyle = orb2;
			ctx.fillRect(0, 0, width, height);

			// Subtle grid lines
			ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
			ctx.lineWidth = 1;
			for (let x = 40; x < width; x += 40) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, height);
				ctx.stroke();
			}
			for (let y = 40; y < height; y += 40) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
				ctx.stroke();
			}

			// Foreground badge card
			ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
			ctx.strokeStyle = "rgba(45, 212, 191, 0.45)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.roundRect(48, 118, 544, 164, 16);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = "#5eead4";
			ctx.font = "600 15px ui-monospace, SFMono-Regular, Menlo, monospace";
			ctx.fillText("SAMPLE AI IMAGE · EMBEDDED METADATA PAYLOAD", 76, 158);

			ctx.fillStyle = "#f8fafc";
			ctx.font = "700 30px system-ui, -apple-system, sans-serif";
			ctx.fillText("SynthIDClear Forensic Test", 76, 202);

			ctx.fillStyle = "#cbd5e1";
			ctx.font = "400 16px system-ui, -apple-system, sans-serif";
			ctx.fillText(
				"Contains caBX (C2PA), iTXt (XMP), tEXt (Prompt), eXIf & tIME chunks",
				76,
				238,
			);
			ctx.fillText(
				"Run Lossless Strip to remove 100% of file metadata at 0% pixel loss",
				76,
				264,
			);

			const blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, "image/png"),
			);
			canvas.width = 0;
			canvas.height = 0;
			if (blob) {
				return new Uint8Array(await blob.arrayBuffer());
			}
		}
	}

	// Fallback minimal valid 1x1 RGB PNG built with exact chunk lengths & CRC32
	const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const ihdr = buildPngChunk(
		"IHDR",
		new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
	);
	// Zlib stream for single 1x1 RGB pixel (filter=0, R=15, G=118, B=110)
	const idat = buildPngChunk(
		"IDAT",
		new Uint8Array([
			0x78, 0x01, 0x01, 0x04, 0x00, 0xfb, 0xff, 0x00, 0x0f, 0x76, 0x6e, 0x02,
			0x84, 0x00, 0xf4,
		]),
	);
	const iend = buildPngChunk("IEND", new Uint8Array(0));
	const fallback = new Uint8Array(
		sig.length + ihdr.length + idat.length + iend.length,
	);
	let p = 0;
	for (const part of [sig, ihdr, idat, iend]) {
		fallback.set(part, p);
		p += part.length;
	}
	return fallback;
}

export async function createSampleAiImageFile(): Promise<File> {
	const basePng = await createBasePngBytes();

	// Locate the IEND chunk offset so we inject valid metadata chunks cleanly before IEND
	const view = new DataView(
		basePng.buffer,
		basePng.byteOffset,
		basePng.byteLength,
	);
	let offset = 8;
	let iendOffset = basePng.length;

	while (offset + 12 <= basePng.length) {
		const length = view.getUint32(offset, false);
		const type = String.fromCharCode(
			basePng[offset + 4],
			basePng[offset + 5],
			basePng[offset + 6],
			basePng[offset + 7],
		);
		if (type === "IEND") {
			iendOffset = offset;
			break;
		}
		offset += 12 + length;
	}

	const injectedChunks = [
		buildTextChunk(
			"parameters",
			"cinematic studio portrait, volumetric teal rim light, ultra detailed 85mm lens\nNegative prompt: blurry, lowres, watermark\nSteps: 28, Sampler: DPM++ 2M Karras, CFG scale: 6.5, Seed: 384920144, Size: 640x400, Model: flux1-dev-fp8",
		),
		buildTextChunk("Software", "ComfyUI v0.3.28 / Stable Diffusion Pipeline"),
		buildItxtChunk("XML:com.adobe.xmp", buildSampleXmpXml()),
		buildC2paCabxChunk(),
		buildPngChunk("eXIf", buildSampleExifPayload()),
		buildTimeChunk(),
	];

	const beforeIend = basePng.subarray(0, iendOffset);
	const iendAndAfter = basePng.subarray(iendOffset);
	const injectedTotal = injectedChunks.reduce(
		(sum, chunk) => sum + chunk.byteLength,
		0,
	);

	const combined = new Uint8Array(
		beforeIend.byteLength + injectedTotal + iendAndAfter.byteLength,
	);
	let pos = 0;
	combined.set(beforeIend, pos);
	pos += beforeIend.byteLength;
	for (const chunk of injectedChunks) {
		combined.set(chunk, pos);
		pos += chunk.byteLength;
	}
	combined.set(iendAndAfter, pos);

	return new File([combined], "sample-ai-credentials.png", {
		type: "image/png",
		lastModified: Date.now(),
	});
}
