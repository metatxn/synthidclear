import type {
	ConversionOptions,
	InputFormat,
	OutputFormat as MediabunnyOutputFormat,
	MetadataTags,
	QualityLevel,
} from "mediabunny";
import type {
	CleanOptions,
	CleanResult,
	ImageFormat,
	MediaTrackSummary,
	MetadataCategory,
	MetadataEntry,
	ParseResult,
} from "./types";
import {
	detectImageFormat,
	formatToMime,
	hasAiSignal,
	isAudioFormat,
	isVideoFormat,
	mimeToExtension,
	sanitizeDisplayText,
	summarizeEntries,
} from "./utils";

async function loadMediabunny() {
	return import("mediabunny");
}

function formatColorSpaceLabel(cs: VideoColorSpaceInit | null): string | null {
	if (!cs) return null;
	const parts = [cs.primaries, cs.transfer, cs.matrix].filter(Boolean);
	if (parts.length === 0) return null;
	return parts.join(" / ");
}

function classifyTagCategory(key: string, value: string): MetadataCategory {
	if (hasAiSignal(key, value)) return "ai-provenance";
	const lower = key.toLowerCase();
	if (lower.includes("xmp")) return "xmp";
	if (
		lower.includes("gps") ||
		lower.includes("location") ||
		lower.includes("make") ||
		lower.includes("model")
	) {
		return "exif";
	}
	if (
		lower.includes("date") ||
		lower.includes("time") ||
		lower.includes("year")
	) {
		return "timestamp";
	}
	if (
		lower.includes("comment") ||
		lower.includes("description") ||
		lower.includes("lyrics")
	) {
		return "comment";
	}
	return "other";
}

function isMediabunnyMuxerVendor(key: string, value: string): boolean {
	const lowerKey = key.toLowerCase();
	const lowerVal = value.toLowerCase();
	return (
		(lowerKey === "vendor" ||
			lowerKey === "encoder" ||
			lowerKey === "writingapp" ||
			lowerKey === "muxingapp") &&
		lowerVal.includes("mediabunny")
	);
}

function mapQualityToLevel(quality: number): QualityLevel {
	if (quality < 0.7) return "low";
	if (quality < 0.82) return "medium";
	if (quality < 0.93) return "high";
	return "very-high";
}

function buildMetadataEntries(
	tags: MetadataTags,
	sourceLabel: string,
	trackNames: string[],
	format: ImageFormat,
): MetadataEntry[] {
	const entries: MetadataEntry[] = [];
	const seenValues = new Set<string>();
	let idx = 0;

	const pushEntry = (
		key: string,
		value: string,
		byteSize: number,
		categoryOverride?: MetadataCategory,
		source = sourceLabel,
	) => {
		const clean = sanitizeDisplayText(value);
		if (!clean) return;
		if (isMediabunnyMuxerVendor(key, clean)) return;
		const aiFlag = hasAiSignal(key, clean);
		const category = aiFlag
			? "ai-provenance"
			: (categoryOverride ?? classifyTagCategory(key, clean));
		entries.push({
			id: `mb-${format}-${idx++}`,
			key,
			value: clean,
			category,
			source,
			byteSize: Math.max(1, byteSize),
			isAiFlag: aiFlag,
		});
		seenValues.add(clean.toLowerCase());
	};

	if (tags.title) pushEntry("Title", tags.title, tags.title.length, "other");
	if (tags.artist)
		pushEntry("Artist / Creator", tags.artist, tags.artist.length, "other");
	if (tags.album) pushEntry("Album", tags.album, tags.album.length, "other");
	if (tags.albumArtist)
		pushEntry(
			"Album Artist",
			tags.albumArtist,
			tags.albumArtist.length,
			"other",
		);
	if (tags.description)
		pushEntry(
			"Description",
			tags.description,
			tags.description.length,
			"comment",
		);
	if (tags.comment)
		pushEntry("Comment", tags.comment, tags.comment.length, "comment");
	if (tags.genre) pushEntry("Genre", tags.genre, tags.genre.length, "other");
	if (tags.lyrics)
		pushEntry(
			"Lyrics / Transcript",
			tags.lyrics,
			tags.lyrics.length,
			"comment",
		);
	if (tags.date instanceof Date && !Number.isNaN(tags.date.getTime())) {
		pushEntry(
			"Release / Recording Date",
			tags.date.toISOString().slice(0, 19).replace("T", " "),
			24,
			"timestamp",
		);
	}
	if (
		tags.creationTime instanceof Date &&
		!Number.isNaN(tags.creationTime.getTime())
	) {
		pushEntry(
			"Container Creation Time",
			`${tags.creationTime.toISOString().slice(0, 19).replace("T", " ")} UTC`,
			24,
			"timestamp",
		);
	}
	if (tags.trackNumber != null) {
		pushEntry(
			"Track Number",
			tags.tracksTotal != null
				? `${tags.trackNumber} / ${tags.tracksTotal}`
				: String(tags.trackNumber),
			8,
			"other",
		);
	}
	if (tags.discNumber != null) {
		pushEntry(
			"Disc Number",
			tags.discsTotal != null
				? `${tags.discNumber} / ${tags.discsTotal}`
				: String(tags.discNumber),
			8,
			"other",
		);
	}
	if (tags.beatsPerMinute != null) {
		pushEntry("BPM", String(tags.beatsPerMinute), 8, "other");
	}

	if (tags.images && tags.images.length > 0) {
		for (let i = 0; i < tags.images.length; i++) {
			const img = tags.images[i];
			const label =
				img.kind === "coverFront"
					? "Embedded Front Cover Art"
					: img.kind === "coverBack"
						? "Embedded Back Cover Art"
						: "Embedded Image Attachment";
			const desc = [
				img.mimeType,
				`${img.data.byteLength.toLocaleString()} bytes`,
				img.name,
				img.description,
			]
				.filter(Boolean)
				.join(" · ");
			pushEntry(label, desc, img.data.byteLength, "other");
		}
	}

	if (tags.raw) {
		for (const [rawKey, rawVal] of Object.entries(tags.raw)) {
			if (rawVal == null) continue;

			if (typeof rawVal === "string") {
				const clean = sanitizeDisplayText(rawVal);
				if (!clean) continue;
				if (isMediabunnyMuxerVendor(rawKey, clean)) continue;
				// Avoid repeating exact normalized string unless key carries AI/technical info
				if (
					seenValues.has(clean.toLowerCase()) &&
					!hasAiSignal(rawKey, clean)
				) {
					continue;
				}
				pushEntry(`Tag: ${rawKey}`, clean, clean.length);
			} else if (Array.isArray(rawVal)) {
				if (rawVal.length === 0) continue;
				if (typeof rawVal[0] === "string") {
					const joined = (rawVal as string[]).join(" · ");
					if (isMediabunnyMuxerVendor(rawKey, joined)) continue;
					if (
						seenValues.has(joined.toLowerCase()) &&
						!hasAiSignal(rawKey, joined)
					) {
						continue;
					}
					pushEntry(`Tag: ${rawKey}`, joined, joined.length);
				} else {
					const totalBytes = (rawVal as Uint8Array[]).reduce(
						(sum, item) => sum + item.byteLength,
						0,
					);
					pushEntry(
						`Binary Tag: ${rawKey}`,
						`${rawVal.length} binary frames (${totalBytes.toLocaleString()} bytes)`,
						totalBytes,
					);
				}
			} else if (rawVal instanceof Uint8Array) {
				pushEntry(
					`Binary Tag: ${rawKey}`,
					`Binary payload (${rawVal.byteLength.toLocaleString()} bytes)`,
					rawVal.byteLength,
				);
			} else if (
				typeof rawVal === "object" &&
				"data" in rawVal &&
				rawVal.data instanceof Uint8Array
			) {
				const mime =
					"mimeType" in rawVal && typeof rawVal.mimeType === "string"
						? rawVal.mimeType
						: "application/octet-stream";
				const name =
					"name" in rawVal && typeof rawVal.name === "string"
						? rawVal.name
						: rawKey;
				pushEntry(
					`Attached File: ${name}`,
					`${mime} · ${rawVal.data.byteLength.toLocaleString()} bytes`,
					rawVal.data.byteLength,
				);
			} else if (typeof rawVal === "object") {
				// Record<string, string> (e.g. ID3v2 TXXX user-defined frames)
				for (const [subKey, subVal] of Object.entries(
					rawVal as Record<string, string>,
				)) {
					if (typeof subVal === "string" && subVal.trim()) {
						pushEntry(`${rawKey}: ${subKey}`, subVal, subVal.length);
					}
				}
			}
		}
	}

	for (const trackName of trackNames) {
		const trimmed = trackName.trim();
		if (!trimmed) continue;
		if (seenValues.has(trimmed.toLowerCase())) continue;
		pushEntry(
			"Track Name / Handler",
			trimmed,
			trimmed.length,
			undefined,
			"Track Header",
		);
	}

	return entries;
}

function detectFormatFromMediabunny(
	inputFormat: InputFormat,
	fallback: ImageFormat,
	hasVideo: boolean,
	mb: Awaited<ReturnType<typeof loadMediabunny>>,
): ImageFormat {
	if (inputFormat instanceof mb.WebMInputFormat) return "webm";
	if (inputFormat instanceof mb.MatroskaInputFormat) return "mkv";
	if (inputFormat instanceof mb.QuickTimeInputFormat) return "mov";
	if (inputFormat instanceof mb.Mp4InputFormat) {
		if (fallback === "m4a" || !hasVideo) return "m4a";
		return "mp4";
	}
	if (inputFormat instanceof mb.Mp3InputFormat) return "mp3";
	if (inputFormat instanceof mb.WaveInputFormat) return "wav";
	if (inputFormat instanceof mb.FlacInputFormat) return "flac";
	if (inputFormat instanceof mb.OggInputFormat) return "ogg";
	if (inputFormat instanceof mb.AdtsInputFormat) return "aac";
	return fallback;
}

function sourceLabelForFormat(format: ImageFormat): string {
	switch (format) {
		case "mkv":
			return "Matroska Tags";
		case "webm":
			return "WebM Tags";
		case "mp3":
			return "ID3 Tags";
		case "wav":
			return "RIFF INFO / ID3";
		case "flac":
			return "FLAC Vorbis / ID3";
		case "ogg":
			return "Ogg Vorbis Comments";
		case "aac":
			return "ADTS / ID3";
		case "m4a":
			return "M4A / iTunes Atoms";
		case "mov":
			return "QuickTime Meta";
		case "mp4":
			return "MP4 Meta";
		default:
			return "Container Metadata";
	}
}

export async function inspectMediaTrackSummary(
	blob: Blob,
): Promise<MediaTrackSummary | null> {
	try {
		const mb = await loadMediabunny();
		const input = new mb.Input({
			formats: [
				mb.MP4,
				mb.QTFF,
				mb.WEBM,
				mb.MATROSKA,
				mb.MP3,
				mb.WAVE,
				mb.FLAC,
				mb.OGG,
				mb.ADTS,
			],
			source: new mb.BlobSource(blob),
		});

		try {
			const [tracks, videoTrack, audioTrack, tags, metaDuration] =
				await Promise.all([
					input.getTracks(),
					input.getPrimaryVideoTrack(),
					input.getPrimaryAudioTrack(),
					input.getMetadataTags().catch(() => ({}) as MetadataTags),
					input.getDurationFromMetadata().catch(() => null),
				]);

			const trackNames: string[] = [];
			for (const track of tracks) {
				const name = await track.getName().catch(() => null);
				if (name?.trim()) trackNames.push(name.trim());
			}

			let videoCodec: string | null = null;
			let videoCodecString: string | null = null;
			let frameRate: number | null = null;
			let frameRateIsConstant: boolean | null = null;
			let hasHdr = false;
			let colorSpace: string | null = null;
			let rotation: number | null = null;

			if (videoTrack) {
				const [vc, vcStr, fpsMetrics, hdr, cs, rot] = await Promise.all([
					videoTrack.getCodec().catch(() => null),
					videoTrack.getCodecParameterString().catch(() => null),
					videoTrack
						.computeFrameRateMetrics({ targetPacketCount: 120 })
						.catch(() => null),
					videoTrack.hasHighDynamicRange().catch(() => false),
					videoTrack.getColorSpace().catch(() => null),
					videoTrack.getRotation().catch(() => null),
				]);
				videoCodec = vc;
				videoCodecString = vcStr;
				if (fpsMetrics && Number.isFinite(fpsMetrics.bestGuessFrameRate)) {
					frameRate = Math.round(fpsMetrics.bestGuessFrameRate * 100) / 100;
					frameRateIsConstant = fpsMetrics.frameRateIsConstant;
				}
				hasHdr = hdr;
				colorSpace = formatColorSpaceLabel(cs);
				rotation = rot;
			}

			let audioCodec: string | null = null;
			let audioCodecString: string | null = null;
			let audioChannels: number | null = null;
			let audioSampleRate: number | null = null;

			if (audioTrack) {
				const [ac, acStr, ch, sr] = await Promise.all([
					audioTrack.getCodec().catch(() => null),
					audioTrack.getCodecParameterString().catch(() => null),
					audioTrack.getNumberOfChannels().catch(() => null),
					audioTrack.getSampleRate().catch(() => null),
				]);
				audioCodec = ac;
				audioCodecString = acStr;
				audioChannels = ch;
				audioSampleRate = sr;
			}

			const durationSeconds =
				metaDuration != null &&
				Number.isFinite(metaDuration) &&
				metaDuration > 0
					? metaDuration
					: await input.computeDuration().catch(() => null);

			return {
				durationSeconds:
					durationSeconds != null && Number.isFinite(durationSeconds)
						? durationSeconds
						: null,
				videoCodec,
				videoCodecString,
				audioCodec,
				audioCodecString,
				frameRate,
				frameRateIsConstant,
				hasHdr,
				colorSpace,
				rotation,
				audioChannels,
				audioSampleRate,
				trackCount: tracks.length,
				trackNames,
				hasCoverArt: Boolean(tags.images && tags.images.length > 0),
			};
		} finally {
			input.dispose();
		}
	} catch {
		return null;
	}
}

export async function parseMediabunnyMetadata(
	blob: Blob,
	knownFormat?: ImageFormat,
): Promise<ParseResult> {
	const headBuf = await blob.slice(0, Math.min(1024, blob.size)).arrayBuffer();
	const detected = knownFormat ?? detectImageFormat(new Uint8Array(headBuf));
	const mb = await loadMediabunny();

	const input = new mb.Input({
		formats: [
			mb.MP4,
			mb.QTFF,
			mb.WEBM,
			mb.MATROSKA,
			mb.MP3,
			mb.WAVE,
			mb.FLAC,
			mb.OGG,
			mb.ADTS,
		],
		source: new mb.BlobSource(blob),
	});

	const parseWarnings: string[] = [];

	try {
		const [inputFormat, tracks, videoTrack, audioTrack, tags, metaDuration] =
			await Promise.all([
				input.getFormat(),
				input.getTracks(),
				input.getPrimaryVideoTrack(),
				input.getPrimaryAudioTrack(),
				input.getMetadataTags().catch(() => ({}) as MetadataTags),
				input.getDurationFromMetadata().catch(() => null),
			]);

		const format = detectFormatFromMediabunny(
			inputFormat,
			detected,
			Boolean(videoTrack),
			mb,
		);
		const mimeType = formatToMime(format);

		let width: number | null = null;
		let height: number | null = null;
		let videoCodec: string | null = null;
		let videoCodecString: string | null = null;
		let frameRate: number | null = null;
		let frameRateIsConstant: boolean | null = null;
		let hasHdr = false;
		let colorSpace: string | null = null;
		let rotation: number | null = null;

		if (videoTrack) {
			const [w, h, vc, vcStr, fpsMetrics, hdr, cs, rot] = await Promise.all([
				videoTrack.getDisplayWidth().catch(() => null),
				videoTrack.getDisplayHeight().catch(() => null),
				videoTrack.getCodec().catch(() => null),
				videoTrack.getCodecParameterString().catch(() => null),
				videoTrack
					.computeFrameRateMetrics({ targetPacketCount: 120 })
					.catch(() => null),
				videoTrack.hasHighDynamicRange().catch(() => false),
				videoTrack.getColorSpace().catch(() => null),
				videoTrack.getRotation().catch(() => null),
			]);
			width = w;
			height = h;
			videoCodec = vc;
			videoCodecString = vcStr;
			if (fpsMetrics && Number.isFinite(fpsMetrics.bestGuessFrameRate)) {
				frameRate = Math.round(fpsMetrics.bestGuessFrameRate * 100) / 100;
				frameRateIsConstant = fpsMetrics.frameRateIsConstant;
			}
			hasHdr = hdr;
			colorSpace = formatColorSpaceLabel(cs);
			rotation = rot;
		}

		let audioCodec: string | null = null;
		let audioCodecString: string | null = null;
		let audioChannels: number | null = null;
		let audioSampleRate: number | null = null;

		if (audioTrack) {
			const [ac, acStr, ch, sr] = await Promise.all([
				audioTrack.getCodec().catch(() => null),
				audioTrack.getCodecParameterString().catch(() => null),
				audioTrack.getNumberOfChannels().catch(() => null),
				audioTrack.getSampleRate().catch(() => null),
			]);
			audioCodec = ac;
			audioCodecString = acStr;
			audioChannels = ch;
			audioSampleRate = sr;
		}

		const trackNames: string[] = [];
		for (const track of tracks) {
			const name = await track.getName().catch(() => null);
			if (name?.trim()) trackNames.push(name.trim());
		}

		const durationSeconds =
			metaDuration != null && Number.isFinite(metaDuration) && metaDuration > 0
				? metaDuration
				: await input.computeDuration().catch(() => null);

		const entries = buildMetadataEntries(
			tags,
			sourceLabelForFormat(format),
			trackNames,
			format,
		);
		const { aiFlagCount, strippableCount } = summarizeEntries(entries);

		return {
			format,
			mimeType,
			width,
			height,
			mediaInfo: {
				durationSeconds:
					durationSeconds != null && Number.isFinite(durationSeconds)
						? durationSeconds
						: null,
				videoCodec,
				videoCodecString,
				audioCodec,
				audioCodecString,
				frameRate,
				frameRateIsConstant,
				hasHdr,
				colorSpace,
				rotation,
				audioChannels,
				audioSampleRate,
				trackCount: tracks.length,
				trackNames,
				hasCoverArt: Boolean(tags.images && tags.images.length > 0),
			},
			byteLength: blob.size,
			hasIccProfile: false,
			iccProfileName: null,
			entries,
			aiFlagCount,
			strippableCount,
			parseWarnings,
		};
	} finally {
		input.dispose();
	}
}

function stripOnlyAiFromTags(inputTags: MetadataTags): MetadataTags {
	const kept: MetadataTags = { creationTime: inputTags.creationTime ?? null };
	const keepIfNonAi = (key: string, value?: string) =>
		value && !hasAiSignal(key, value) ? value : undefined;

	kept.title = keepIfNonAi("title", inputTags.title);
	kept.description = keepIfNonAi("description", inputTags.description);
	kept.artist = keepIfNonAi("artist", inputTags.artist);
	kept.album = keepIfNonAi("album", inputTags.album);
	kept.albumArtist = keepIfNonAi("albumArtist", inputTags.albumArtist);
	kept.genre = keepIfNonAi("genre", inputTags.genre);
	kept.lyrics = keepIfNonAi("lyrics", inputTags.lyrics);
	kept.comment = keepIfNonAi("comment", inputTags.comment);
	if (inputTags.date) kept.date = inputTags.date;
	if (inputTags.trackNumber != null) kept.trackNumber = inputTags.trackNumber;
	if (inputTags.tracksTotal != null) kept.tracksTotal = inputTags.tracksTotal;
	if (inputTags.discNumber != null) kept.discNumber = inputTags.discNumber;
	if (inputTags.discsTotal != null) kept.discsTotal = inputTags.discsTotal;
	if (inputTags.beatsPerMinute != null)
		kept.beatsPerMinute = inputTags.beatsPerMinute;
	if (inputTags.images) kept.images = inputTags.images;

	if (inputTags.raw) {
		const nextRaw: NonNullable<MetadataTags["raw"]> = {};
		for (const [k, v] of Object.entries(inputTags.raw)) {
			if (v == null) continue;
			if (typeof v === "string") {
				if (!hasAiSignal(k, v)) nextRaw[k] = v;
			} else if (Array.isArray(v) && typeof v[0] === "string") {
				const filtered = (v as string[]).filter(
					(item) => !hasAiSignal(k, item),
				);
				if (filtered.length > 0) nextRaw[k] = filtered;
			} else if (
				typeof v === "object" &&
				!(v instanceof Uint8Array) &&
				!("data" in v)
			) {
				const sub: Record<string, string> = {};
				for (const [sk, sv] of Object.entries(v as Record<string, string>)) {
					if (typeof sv === "string" && !hasAiSignal(`${k}:${sk}`, sv)) {
						sub[sk] = sv;
					}
				}
				if (Object.keys(sub).length > 0) nextRaw[k] = sub;
			} else if (!hasAiSignal(k, "")) {
				nextRaw[k] = v;
			}
		}
		if (Object.keys(nextRaw).length > 0) kept.raw = nextRaw;
	}

	return kept;
}

function createOutputFormatForMedia(
	format: ImageFormat,
	options: CleanOptions,
	mb: Awaited<ReturnType<typeof loadMediabunny>>,
): {
	outputFormat: MediabunnyOutputFormat;
	outputMimeType: string;
	outputExtension: string;
} {
	if (options.mode === "deep" && isVideoFormat(format)) {
		if (options.outputFormat === "video/webm") {
			const fmt = new mb.WebMOutputFormat();
			return {
				outputFormat: fmt,
				outputMimeType: "video/webm",
				outputExtension: "webm",
			};
		}
		if (options.outputFormat === "video/mp4" || format !== "webm") {
			const fmt = new mb.Mp4OutputFormat({ fastStart: "in-memory" });
			return {
				outputFormat: fmt,
				outputMimeType: "video/mp4",
				outputExtension: "mp4",
			};
		}
	}

	switch (format) {
		case "webm":
			return {
				outputFormat: new mb.WebMOutputFormat(),
				outputMimeType: "video/webm",
				outputExtension: "webm",
			};
		case "mkv":
			return {
				outputFormat: new mb.MkvOutputFormat(),
				outputMimeType: "video/x-matroska",
				outputExtension: "mkv",
			};
		case "mov":
			return {
				outputFormat: new mb.MovOutputFormat({ fastStart: "in-memory" }),
				outputMimeType: "video/quicktime",
				outputExtension: "mov",
			};
		case "mp4":
			return {
				outputFormat: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
				outputMimeType: "video/mp4",
				outputExtension: "mp4",
			};
		case "mp3":
			return {
				outputFormat: new mb.Mp3OutputFormat(),
				outputMimeType: "audio/mpeg",
				outputExtension: "mp3",
			};
		case "wav":
			return {
				outputFormat: new mb.WavOutputFormat(),
				outputMimeType: "audio/wav",
				outputExtension: "wav",
			};
		case "flac":
			return {
				outputFormat: new mb.FlacOutputFormat(),
				outputMimeType: "audio/flac",
				outputExtension: "flac",
			};
		case "ogg":
			return {
				outputFormat: new mb.OggOutputFormat(),
				outputMimeType: "audio/ogg",
				outputExtension: "ogg",
			};
		case "aac":
			return {
				outputFormat: new mb.AdtsOutputFormat(),
				outputMimeType: "audio/aac",
				outputExtension: "aac",
			};
		case "m4a":
			return {
				outputFormat: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
				outputMimeType: "audio/mp4",
				outputExtension: "m4a",
			};
		default:
			return {
				outputFormat: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
				outputMimeType: formatToMime(format),
				outputExtension: mimeToExtension(formatToMime(format)),
			};
	}
}

export async function stripMediabunnyMetadata(
	blob: Blob,
	options: CleanOptions,
): Promise<CleanResult> {
	const headBuf = await blob.slice(0, Math.min(1024, blob.size)).arrayBuffer();
	const detected = detectImageFormat(new Uint8Array(headBuf));
	const mb = await loadMediabunny();

	const input = new mb.Input({
		formats: [
			mb.MP4,
			mb.QTFF,
			mb.WEBM,
			mb.MATROSKA,
			mb.MP3,
			mb.WAVE,
			mb.FLAC,
			mb.OGG,
			mb.ADTS,
		],
		source: new mb.BlobSource(blob),
	});

	try {
		const [inputFormat, videoTrack, beforeTags] = await Promise.all([
			input.getFormat(),
			input.getPrimaryVideoTrack(),
			input.getMetadataTags().catch(() => ({}) as MetadataTags),
		]);

		const format = detectFormatFromMediabunny(
			inputFormat,
			detected,
			Boolean(videoTrack),
			mb,
		);
		const isDeepVideo = options.mode === "deep" && isVideoFormat(format);

		if (
			isDeepVideo &&
			(typeof VideoDecoder === "undefined" ||
				typeof VideoEncoder === "undefined")
		) {
			throw new Error(
				"Your browser does not support WebCodecs video re-encoding. Switch back to Keep Original Quality for instant lossless cleaning.",
			);
		}

		const { outputFormat, outputMimeType, outputExtension } =
			createOutputFormatForMedia(format, options, mb);

		const target = new mb.BufferTarget();
		const output = new mb.Output({ format: outputFormat, target });

		const tagsOption: ConversionOptions["tags"] =
			options.stripScope === "ai-only" && !isDeepVideo
				? (inTags) => stripOnlyAiFromTags(inTags)
				: { creationTime: null };

		const baseConfig: ConversionOptions = {
			input,
			output,
			tracks: isDeepVideo ? "primary" : "all",
			showWarnings: false,
			tags: tagsOption,
		};

		let conversion: Awaited<ReturnType<typeof mb.Conversion.init>>;

		if (isDeepVideo) {
			const qualityLevel = mapQualityToLevel(options.quality);
			conversion = await mb.Conversion.init({
				...baseConfig,
				video: {
					quality: new mb.Quality(qualityLevel),
					allowTransformationMetadata: false,
					forceTranscode: true,
				},
			});
		} else {
			// Lossless packet copy first (works without WebCodecs encoders for MKV, WebM, MP3, WAV, FLAC, OGG, AAC, M4A)
			conversion = await mb.Conversion.init({
				...baseConfig,
				copy: {
					mode: "forced",
					shiftTolerance: Number.POSITIVE_INFINITY,
				},
			});
			if (!conversion.isValid) {
				const retryTarget = new mb.BufferTarget();
				const retryOutput = new mb.Output({
					format: outputFormat,
					target: retryTarget,
				});
				conversion = await mb.Conversion.init({
					...baseConfig,
					output: retryOutput,
					copy: {
						mode: "preferred",
						shiftTolerance: Number.POSITIVE_INFINITY,
					},
				});
				if (!conversion.isValid) {
					throw new Error(
						`This ${format.toUpperCase()} stream cannot be remuxed cleanly in your browser.`,
					);
				}
				await conversion.execute();
				if (!retryTarget.buffer || retryTarget.buffer.byteLength === 0) {
					throw new Error("Media cleaning produced an empty file.");
				}
				const cleanedBlob = new Blob([retryTarget.buffer], {
					type: outputMimeType,
				});
				const verification = await parseMediabunnyMetadata(
					cleanedBlob,
					isAudioFormat(format) ? format : undefined,
				);
				return {
					cleanedBuffer: null,
					cleanedBlob,
					outputMimeType,
					outputExtension,
					modeUsed: "lossless",
					stripScope: options.stripScope,
					originalSize: blob.size,
					cleanedSize: cleanedBlob.size,
					iccPreserved: false,
					removedSegments: summarizeRemovedTags(beforeTags, format, false),
					verification,
				};
			}
		}

		if (!conversion.isValid) {
			throw new Error(
				`Could not prepare ${format.toUpperCase()} for ${isDeepVideo ? "conversion" : "cleaning"}.`,
			);
		}

		await conversion.execute();

		if (!target.buffer || target.buffer.byteLength === 0) {
			throw new Error("Media cleaning produced an empty file.");
		}

		const cleanedBlob = new Blob([target.buffer], { type: outputMimeType });
		const verification = await parseMediabunnyMetadata(
			cleanedBlob,
			outputExtension === "m4a" ? "m4a" : undefined,
		);

		return {
			cleanedBuffer: null,
			cleanedBlob,
			outputMimeType,
			outputExtension,
			modeUsed: isDeepVideo ? "deep" : "lossless",
			stripScope: isDeepVideo ? "all" : options.stripScope,
			originalSize: blob.size,
			cleanedSize: cleanedBlob.size,
			iccPreserved: false,
			removedSegments: summarizeRemovedTags(beforeTags, format, isDeepVideo),
			verification,
		};
	} finally {
		input.dispose();
	}
}

function summarizeRemovedTags(
	beforeTags: MetadataTags,
	format: ImageFormat,
	isDeepVideo: boolean,
): string[] {
	const removed: string[] = [];
	if (isDeepVideo) removed.push("Full Video Re-encode");
	if (beforeTags.title) removed.push("Title");
	if (beforeTags.artist) removed.push("Artist");
	if (beforeTags.album) removed.push("Album");
	if (beforeTags.comment) removed.push("Comment");
	if (beforeTags.description) removed.push("Description");
	if (beforeTags.lyrics) removed.push("Lyrics");
	if (beforeTags.date) removed.push("Date");
	if (beforeTags.creationTime) removed.push("Creation Time");
	if (beforeTags.images && beforeTags.images.length > 0) {
		removed.push(`Cover Art (${beforeTags.images.length})`);
	}
	if (beforeTags.raw) {
		const rawCount = Object.keys(beforeTags.raw).length;
		if (rawCount > 0)
			removed.push(`${sourceLabelForFormat(format)} (${rawCount})`);
	}
	if (removed.length === 0) {
		removed.push(`${format.toUpperCase()} Container Remux`);
	}
	return removed;
}
