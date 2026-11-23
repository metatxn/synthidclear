import { createFileRoute } from "@tanstack/react-router";
import { CleanerWorkspace } from "#/components/CleanerWorkspace";
import { FaqAccordion, type FaqItem } from "#/components/FaqAccordion";
import { JsonLd } from "#/components/JsonLd";
import { AUDIO_ACCEPT } from "#/lib/format";
import {
	buildBreadcrumbSchema,
	buildFaqSchema,
	buildRouteHead,
	buildSoftwareAppSchema,
} from "#/lib/seo";

const AUDIO_FAQS: readonly FaqItem[] = [
	{
		question: "Which audio formats can I clean without losing audio quality?",
		answer:
			"SynthIDClear losslessly strips hidden tags from MP3, WAV, FLAC, OGG, M4A, and AAC files directly in your browser. Encoded audio packets are copied untouched with zero re-encoding.",
	},
	{
		question:
			"What hidden metadata lives inside MP3, WAV, FLAC, and M4A files?",
		answer:
			"Audio files often carry ID3v1/ID3v2 frames, custom TXXX tags, Vorbis comments, RIFF INFO chunks, embedded cover art, lyrics, encoder vendor strings, creation dates, and AI generator credits (such as Suno, Udio, or ElevenLabs).",
	},
	{
		question: "Does removing audio metadata erase invisible audio watermarks?",
		answer:
			"No. Metadata cleaning strips container tags, embedded artwork, and headers, while imperceptible audio watermarks (such as SynthID Audio) are embedded in the audio waveform itself.",
	},
	{
		question: "Are my audio files uploaded to a server?",
		answer:
			"Never. All parsing, tag removal, and post-clean verification run 100% locally in your browser with zero uploads.",
	},
];

export const Route = createFileRoute("/audio-metadata-remover")({
	head: () =>
		buildRouteHead({
			title:
				"Audio Metadata Remover: MP3, WAV, FLAC, OGG & M4A (No Upload) | SynthIDClear",
			description:
				"Losslessly strip ID3 tags, Vorbis comments, RIFF INFO, cover art, lyrics, and AI audio tags from MP3, WAV, FLAC, OGG, M4A, and AAC files in your browser.",
			path: "/audio-metadata-remover",
		}),
	component: AudioMetadataRemoverPage,
});

function AudioMetadataRemoverPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
			<JsonLd
				data={buildBreadcrumbSchema([
					{ name: "Home", path: "/" },
					{ name: "All Free Tools", path: "/tools" },
					{ name: "Audio Metadata Remover", path: "/audio-metadata-remover" },
				])}
			/>
			<JsonLd
				data={buildSoftwareAppSchema({
					name: "SynthIDClear — In-Browser Audio Metadata Remover",
					description:
						"Lossless in-browser MP3, WAV, FLAC, OGG, M4A, and AAC metadata remover with zero uploads.",
					path: "/audio-metadata-remover",
				})}
			/>
			<JsonLd data={buildFaqSchema(AUDIO_FAQS)} />

			<section className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
				<h1 className="m-0 text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-(--text-primary) sm:text-4xl">
					Audio Metadata Remover (MP3, WAV, FLAC, OGG &amp; M4A)
				</h1>
				<p className="mx-auto my-0 max-w-2xl text-base leading-relaxed text-pretty text-(--text-secondary)">
					Strip ID3 tags, Vorbis comments, RIFF INFO, embedded cover art,
					lyrics, and AI generator tags from audio files right in your browser —
					zero uploads and zero re-encoding.
				</p>
			</section>

			<CleanerWorkspace
				accept={AUDIO_ACCEPT}
				dropzoneHeading="Drop MP3, WAV, FLAC, OGG, M4A, or AAC files here"
				dropzoneSubtext="100% lossless tag & cover art stripping · Stays on your device"
				hideSampleButton
			/>

			<FaqAccordion heading="Common questions" items={AUDIO_FAQS} />
		</div>
	);
}
