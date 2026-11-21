import { CopyCodeBlock } from "./CopyCodeBlock";

export function VideoCliPanel() {
	return (
		<div className="space-y-6">
			<div className="space-y-5 rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
				<div className="space-y-1">
					<h2 className="m-0 text-lg font-semibold text-(--text-primary)">
						Zero-upload video metadata cleaning with FFmpeg
					</h2>
					<p className="m-0 text-sm text-(--text-secondary)">
						Run locally in your terminal — instant, free, and works on large 4K
						clips without uploading anything.
					</p>
				</div>

				<div className="space-y-4">
					<div className="space-y-2">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							1. Fast lossless strip (Recommended — 0% quality loss)
						</h3>
						<p className="m-0 text-xs leading-relaxed text-(--text-secondary)">
							Copies video and audio untouched while dropping hidden metadata
							like creation dates, GPS location, camera info, and AI tags.
						</p>
						<CopyCodeBlock
							label="FFmpeg · Lossless copy"
							code="ffmpeg -i input.mp4 -map_metadata -1 -c copy output_clean.mp4"
							ariaLabel="Copy FFmpeg lossless metadata strip command"
						/>
					</div>

					<div className="space-y-2">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							2. Full re-encode (H.264 + AAC)
						</h3>
						<p className="m-0 text-xs leading-relaxed text-(--text-secondary)">
							Re-encodes the video and audio tracks cleanly while removing all
							container metadata.
						</p>
						<CopyCodeBlock
							label="FFmpeg · Re-encode"
							code="ffmpeg -i input.mp4 -map_metadata -1 -c:v libx264 -crf 18 -c:a aac output_reencoded.mp4"
							ariaLabel="Copy FFmpeg H.264 AAC re-encode command"
						/>
					</div>

					<div className="space-y-2">
						<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
							3. Strip extra data tracks &amp; verify
						</h3>
						<p className="m-0 text-xs leading-relaxed text-(--text-secondary)">
							Also removes chapters and timed data tracks, then checks the
							output file with <code className="font-mono">ffprobe</code>.
						</p>
						<CopyCodeBlock
							label="FFmpeg · Clean + Verify"
							code={`ffmpeg -i input.mov -map 0:v -map 0:a? -map_metadata -1 -map_chapters -1 -fflags +bitexact -c copy output_clean.mp4\nffprobe -v quiet -print_format json -show_format -show_streams output_clean.mp4`}
							ariaLabel="Copy FFmpeg strip chapters and ffprobe verification commands"
						/>
					</div>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="rounded-2xl border border-(--border-color) bg-(--bg-surface) p-5">
					<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
						Why run FFmpeg locally?
					</h3>
					<p className="mt-1.5 mb-0 text-xs leading-relaxed text-(--text-secondary)">
						Uploading large 4K videos to third-party servers is slow and risky.
						Running FFmpeg on your own computer finishes a lossless strip in
						seconds with total privacy.
					</p>
				</div>

				<div className="rounded-2xl border border-(--border-color) bg-(--bg-surface) p-5">
					<h3 className="m-0 text-sm font-semibold text-(--text-primary)">
						Metadata vs. invisible video watermarks
					</h3>
					<p className="mt-1.5 mb-0 text-xs leading-relaxed text-(--text-secondary)">
						<code className="font-mono">-map_metadata -1</code> removes file
						headers (dates, GPS, encoder tags, C2PA boxes). It does{" "}
						<strong>not</strong> remove imperceptible frame or audio watermarks
						such as Google SynthID.
					</p>
				</div>
			</div>
		</div>
	);
}
