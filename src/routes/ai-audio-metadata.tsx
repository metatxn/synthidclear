import { createFileRoute } from "@tanstack/react-router";
import type { FaqItem } from "#/components/FaqAccordion";
import { PlatformGuide } from "#/components/PlatformGuide";
import { AUDIO_ACCEPT } from "#/lib/format";
import { buildRouteHead } from "#/lib/seo";

const PATH = "/ai-audio-metadata";

const FAQS: readonly FaqItem[] = [
	{
		question:
			"Do Suno AI, Udio, or ElevenLabs embed hidden metadata in audio files?",
		answer:
			"Yes. Downloaded MP3, WAV, FLAC, OGG, and M4A exports often carry ID3v2/TXXX frames, RIFF INFO chunks, Vorbis comments, creation dates, embedded album artwork, lyrics, and generator software strings.",
	},
	{
		question:
			"Does cleaning audio metadata re-encode my track or reduce fidelity?",
		answer:
			"No. SynthIDClear copies the encoded audio packets losslessly into a clean container with metadata tags and embedded cover art removed — 0% quality loss for MP3, WAV, FLAC, OGG, M4A, and AAC.",
	},
	{
		question:
			"Will metadata cleaning remove SynthID Audio or imperceptible watermarks?",
		answer:
			"No. Invisible audio watermarks such as Google SynthID Audio (used on Lyria) are embedded in the audio waveform itself, not in file header tags. Metadata cleaning removes only header tags, lyrics, and embedded artwork.",
	},
	{
		question:
			"Can I keep artist and title tags while removing only AI generator fields?",
		answer:
			"Yes. Expand Options in the cleaner bar above and switch 'What to remove' to 'AI tags & prompts only' to strip AI-flagged tags while keeping standard track tags.",
	},
];

export const Route = createFileRoute("/ai-audio-metadata")({
	head: () =>
		buildRouteHead({
			title:
				"AI Audio Metadata (Suno, Udio, ElevenLabs & Lyria): Check & Remove | SynthIDClear",
			description:
				"Inspect and losslessly remove ID3 tags, TXXX frames, Vorbis comments, RIFF INFO, lyrics, and cover art from AI-generated MP3, WAV, FLAC, OGG, and M4A audio in your browser.",
			path: PATH,
		}),
	component: AiAudioMetadataPage,
});

function AiAudioMetadataPage() {
	return (
		<PlatformGuide
			path={PATH}
			heading="What AI audio files carry, and how to clean them losslessly"
			intro="Tracks exported from Suno AI, Udio, ElevenLabs, Google Lyria, and MusicGen often carry ID3 tags, custom TXXX fields, RIFF INFO chunks, Vorbis comments, lyrics, and cover art. Inspect and strip them losslessly in your browser with zero uploads."
			signalsHeading="Where hidden tags live in audio files"
			signals={[
				{
					title: "ID3v2, TXXX & M4A atoms",
					body: "MP3, AAC, and M4A downloads store title, artist, encoder strings, creation dates, lyrics, embedded JPEG/PNG cover art, and custom TXXX user text frames.",
				},
				{
					title: "RIFF INFO & Vorbis comments",
					body: "WAV exports store RIFF INFO chunks (IART, ICMT, INAM, ICRD), while FLAC and OGG files carry Vorbis comment key-value pairs and vendor strings.",
				},
				{
					title: "Invisible audio watermarks",
					body: "Imperceptible signals like Google SynthID Audio live inside the audio waveform itself so they persist even after metadata removal or re-encoding.",
				},
			]}
			steps={[
				"Drop your MP3, WAV, FLAC, OGG, M4A, or AAC file into the cleaner above. Inspection runs locally with zero uploads.",
				"Check the Streams forensics bar (codec, channels, sample rate) and open View raw metadata details to inspect every ID3, RIFF INFO, Vorbis, or cover-art entry.",
				"Click Clean Audio (or switch to AI tags & prompts only in Options if you want to keep non-AI artist/title fields).",
				"Confirm After Clean (0) and download your lossless cleaned audio copy.",
			]}
			limits={[
				"Imperceptible waveform watermarks (such as Google SynthID Audio) are embedded in the audio signal itself and are not removed by metadata cleaning.",
				"In OGG and FLAC files, the codec specification requires a container vendor string; SynthIDClear replaces any previous encoder/generator vendor header cleanly.",
				"Follow platform and distributor policies whenever disclosing AI-generated music or voice tracks.",
			]}
			accept={AUDIO_ACCEPT}
			dropzoneHeading="Drop MP3, WAV, FLAC, OGG, M4A, or AAC audio files here"
			dropzoneSubtext="100% lossless tag & cover art stripping · Stays on your device"
			hideSampleButton
			extraLink={{
				to: "/audio-metadata-remover",
				label: "Open dedicated Audio Metadata Remover",
			}}
			faqs={FAQS}
			schemaName="SynthIDClear AI Audio Metadata Guide & Cleaner"
			schemaDescription="Inspect and losslessly remove ID3, Vorbis, RIFF INFO, cover art, and AI generator tags from MP3, WAV, FLAC, OGG, M4A, and AAC audio files locally in your browser."
		/>
	);
}
