import type { CreatorImpact, ParseResult } from "./types";
import { isVideoFormat } from "./utils";

const GENERATOR_MATCHERS: Array<{ label: string; pattern: RegExp }> = [
	{ label: "ComfyUI", pattern: /\bcomfyui\b/i },
	{ label: "Flux.1", pattern: /\bflux\.?1\b/i },
	{ label: "Midjourney", pattern: /\bmidjourney\b/i },
	{ label: "Adobe Firefly", pattern: /\badobe\s*firefly\b/i },
	{ label: "OpenAI Sora", pattern: /\bsora\b/i },
	{ label: "Runway", pattern: /\brunway\b/i },
	{ label: "Kling AI", pattern: /\bkling\b/i },
	{ label: "Google Veo", pattern: /\bveo\b/i },
	{ label: "Suno AI", pattern: /\bsuno\b/i },
	{ label: "Udio", pattern: /\budio\b/i },
	{ label: "ElevenLabs", pattern: /\belevenlabs\b/i },
	{ label: "Google Lyria / AudioLM", pattern: /\b(?:lyria|audiolm)\b/i },
	{ label: "Meta MusicGen", pattern: /\bmusicgen\b/i },
	{ label: "ChatGPT / OpenAI", pattern: /\b(?:chatgpt|openai)\b/i },
	{ label: "DALL-E", pattern: /\bdall[- ]?e\b/i },
	{ label: "Google Gemini / Imagen", pattern: /\b(?:gemini|imagen)\b/i },
	{
		label: "Stable Diffusion",
		pattern: /\b(?:stable\s*diffusion|automatic1111)\b/i,
	},
	{ label: "Adobe Photoshop", pattern: /\bphotoshop\b/i },
	{ label: "NovelAI", pattern: /\bnovelai\b/i },
];

export function analyzeCreatorImpact(meta: ParseResult): CreatorImpact {
	let hasC2pa = false;
	let hasIptcAiTag = false;
	let hasSavedPrompt = false;
	let hasGps = false;
	let gpsLat: string | null = null;
	let gpsLatRef = "";
	let gpsLon: string | null = null;
	let gpsLonRef = "";
	let detectedGenerator: string | null = null;

	for (const entry of meta.entries) {
		const lowerKey = entry.key.toLowerCase();
		const lowerSource = entry.source.toLowerCase();
		const lowerVal = entry.value.toLowerCase();

		if (
			lowerSource.includes("cabx") ||
			lowerSource.includes("jumb") ||
			lowerSource.includes("c2pa") ||
			lowerSource.includes("app11") ||
			lowerKey.includes("c2pa") ||
			lowerKey.includes("jumbf") ||
			lowerVal.includes("c2pa.")
		) {
			hasC2pa = true;
		}

		if (
			lowerKey.includes("digitalsourcetype") ||
			lowerVal.includes("trainedalgorithmicmedia") ||
			lowerVal.includes("compositewithtrainedalgorithmicmedia") ||
			lowerVal.includes("algorithmicmedia")
		) {
			hasIptcAiTag = true;
		}

		if (
			lowerKey === "text: parameters" ||
			lowerKey === "text: prompt" ||
			lowerKey === "text: workflow" ||
			lowerKey === "itxt: parameters" ||
			lowerKey === "itxt: prompt" ||
			lowerKey === "itxt: workflow" ||
			lowerKey === "ztxt: parameters" ||
			lowerVal.includes("negative prompt:") ||
			lowerVal.includes("cfg scale:") ||
			lowerVal.includes("sampler:")
		) {
			hasSavedPrompt = true;
		}

		if (lowerKey.includes("gpslatitude") && !lowerKey.includes("ref")) {
			hasGps = true;
			gpsLat = entry.value.trim();
		} else if (lowerKey.includes("gpslatituderef")) {
			gpsLatRef = entry.value.trim().toUpperCase().slice(0, 1);
		} else if (lowerKey.includes("gpslongitude") && !lowerKey.includes("ref")) {
			hasGps = true;
			gpsLon = entry.value.trim();
		} else if (lowerKey.includes("gpslongituderef")) {
			gpsLonRef = entry.value.trim().toUpperCase().slice(0, 1);
		} else if (
			lowerKey.includes("gps location") ||
			lowerKey.includes("location.iso6709") ||
			lowerKey.includes("©xyz") ||
			lowerKey.includes("(loci)")
		) {
			hasGps = true;
			if (!gpsLat && /[+-]\d+\.\d+[+-]\d+\.\d+/.test(entry.value)) {
				const match = entry.value.match(
					/([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/,
				);
				if (match) {
					const lat = Number.parseFloat(match[1]);
					const lon = Number.parseFloat(match[2]);
					gpsLat = `${Math.abs(lat).toFixed(4)}°`;
					gpsLatRef = lat >= 0 ? "N" : "S";
					gpsLon = `${Math.abs(lon).toFixed(4)}°`;
					gpsLonRef = lon >= 0 ? "E" : "W";
				}
			}
		}

		if (!detectedGenerator) {
			const combined = `${entry.key} ${entry.value}`;
			for (const matcher of GENERATOR_MATCHERS) {
				if (matcher.pattern.test(combined)) {
					detectedGenerator = matcher.label;
					break;
				}
			}
		}
	}

	const gpsSummary =
		gpsLat && gpsLon
			? `${gpsLat}${gpsLatRef ? ` ${gpsLatRef}` : ""}, ${gpsLon}${gpsLonRef ? ` ${gpsLonRef}` : ""}`
			: null;

	const warnings: string[] = [];
	if (hasC2pa || hasIptcAiTag) {
		warnings.push(
			"Contains AI creator credentials that Instagram (“AI info”) and TikTok read to label posts.",
		);
	} else if (detectedGenerator) {
		warnings.push(
			`Contains ${detectedGenerator} metadata tags embedded inside the file header.`,
		);
	} else if (meta.aiFlagCount > 0) {
		warnings.push(
			"Contains AI-related tags embedded inside the container metadata.",
		);
	}
	if (hasSavedPrompt) {
		warnings.push(
			"Contains saved generation prompt & settings anyone can inspect.",
		);
	}
	if (hasGps) {
		const isVideo = isVideoFormat(meta.format);
		warnings.push(
			gpsSummary
				? `Contains GPS location (${gpsSummary}).`
				: isVideo
					? "Contains GPS location showing where this video was recorded."
					: "Contains GPS location showing where this photo was taken.",
		);
	}

	return {
		hasC2pa,
		hasIptcAiTag,
		hasSavedPrompt,
		hasGps,
		gpsSummary,
		detectedGenerator,
		warnings,
	};
}
