export function HowItWorksPanel() {
	return (
		<div className="space-y-8">
			{/* 3 Core Principles */}
			<section
				aria-label="How SynthIDClear protects your privacy and quality"
				className="grid gap-4 md:grid-cols-3"
			>
				<div className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-base font-semibold text-(--text-primary)">
						100% browser processing
					</h2>
					<p className="mt-2 mb-0 text-sm leading-relaxed text-(--text-secondary)">
						Every byte of parsing, metadata stripping, and verification runs
						inside a local browser Web Worker. Your images never leave your
						device.
					</p>
				</div>

				<div className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-base font-semibold text-(--text-primary)">
						Lossless by default
					</h2>
					<p className="mt-2 mb-0 text-sm leading-relaxed text-(--text-secondary)">
						SynthIDClear copies compressed pixel streams untouched and slices
						out only metadata chunks — avoiding JPEG/WebP generation loss and
						keeping 16-bit PNG quality.
					</p>
				</div>

				<div className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
					<h2 className="m-0 text-base font-semibold text-(--text-primary)">
						Color profile safeguard
					</h2>
					<p className="mt-2 mb-0 text-sm leading-relaxed text-(--text-secondary)">
						Wide-gamut Display P3 and sRGB color profiles stay intact by default
						so modern AI renders and smartphone photos never look washed out.
					</p>
				</div>
			</section>

			{/* Binary Format Table (for technical visitors on /how-it-works) */}
			<section className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-6">
				<h2 className="m-0 mb-4 text-lg font-semibold text-(--text-primary)">
					Technical Reference: Chunks Stripped vs. Preserved
				</h2>

				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-left text-sm">
						<caption className="visually-hidden">
							Binary segments and chunks stripped versus preserved for JPEG,
							PNG, and WebP formats in Lossless mode
						</caption>
						<thead>
							<tr className="border-b border-(--border-color) text-xs font-semibold text-(--text-muted) uppercase">
								<th scope="col" className="py-3 pr-4">
									Format
								</th>
								<th scope="col" className="px-4 py-3">
									Segments / Chunks Stripped
								</th>
								<th scope="col" className="py-3 pl-4">
									Segments / Chunks Preserved
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-(--border-color) text-(--text-secondary)">
							<tr>
								<th
									scope="row"
									className="py-3.5 pr-4 font-mono font-bold text-(--text-primary)"
								>
									JPEG
								</th>
								<td className="px-4 py-3.5">
									<code className="font-mono text-xs">APP1</code> (EXIF, XMP),{" "}
									<code className="font-mono text-xs">APP3</code>–
									<code className="font-mono text-xs">APP13</code> (incl.{" "}
									<code className="font-mono text-xs">APP11</code> C2PA/JUMBF,{" "}
									<code className="font-mono text-xs">APP13</code> IPTC),{" "}
									<code className="font-mono text-xs">COM</code> (comments),
									trailing bytes after{" "}
									<code className="font-mono text-xs">EOI</code>
								</td>
								<td className="py-3.5 pl-4">
									<code className="font-mono text-xs">SOI</code>,{" "}
									<code className="font-mono text-xs">APP0</code> (JFIF),{" "}
									<code className="font-mono text-xs">APP14</code> (Adobe
									color), <code className="font-mono text-xs">DQT</code>,{" "}
									<code className="font-mono text-xs">DHT</code>,{" "}
									<code className="font-mono text-xs">SOF*</code>,{" "}
									<code className="font-mono text-xs">SOS</code>,{" "}
									<code className="font-mono text-xs">EOI</code>, and{" "}
									<strong className="text-(--text-primary)">
										<code className="font-mono text-xs">APP2</code>{" "}
										(ICC_PROFILE)
									</strong>{" "}
									when enabled
								</td>
							</tr>
							<tr>
								<th
									scope="row"
									className="py-3.5 pr-4 font-mono font-bold text-(--text-primary)"
								>
									PNG
								</th>
								<td className="px-4 py-3.5">
									<code className="font-mono text-xs">tEXt</code>,{" "}
									<code className="font-mono text-xs">iTXt</code>,{" "}
									<code className="font-mono text-xs">zTXt</code> (AI prompts
									&amp; XMP), <code className="font-mono text-xs">eXIf</code>,{" "}
									<code className="font-mono text-xs">caBX</code> /{" "}
									<code className="font-mono text-xs">jumb</code> (C2PA),{" "}
									<code className="font-mono text-xs">tIME</code>, trailing
									bytes after <code className="font-mono text-xs">IEND</code>
								</td>
								<td className="py-3.5 pl-4">
									<code className="font-mono text-xs">IHDR</code>,{" "}
									<code className="font-mono text-xs">PLTE</code>,{" "}
									<code className="font-mono text-xs">IDAT</code>,{" "}
									<code className="font-mono text-xs">IEND</code>,{" "}
									<code className="font-mono text-xs">tRNS</code>,{" "}
									<code className="font-mono text-xs">sRGB</code>,{" "}
									<code className="font-mono text-xs">gAMA</code>,{" "}
									<code className="font-mono text-xs">cHRM</code>,{" "}
									<code className="font-mono text-xs">pHYs</code>,{" "}
									<code className="font-mono text-xs">bKGD</code>, and{" "}
									<strong className="text-(--text-primary)">
										<code className="font-mono text-xs">iCCP</code>
									</strong>{" "}
									when enabled
								</td>
							</tr>
							<tr>
								<th
									scope="row"
									className="py-3.5 pr-4 font-mono font-bold text-(--text-primary)"
								>
									WebP (RIFF)
								</th>
								<td className="px-4 py-3.5">
									<code className="font-mono text-xs">EXIF</code>,{" "}
									<code className="font-mono text-xs">XMP </code>,{" "}
									<code className="font-mono text-xs">C2PA</code>,{" "}
									<code className="font-mono text-xs">JUMB</code>, trailing
									bytes — plus clears EXIF (
									<code className="font-mono text-xs">0x08</code>) and XMP (
									<code className="font-mono text-xs">0x04</code>) bits in{" "}
									<code className="font-mono text-xs">VP8X</code> and recomputes
									RIFF size
								</td>
								<td className="py-3.5 pl-4">
									<code className="font-mono text-xs">VP8 </code>,{" "}
									<code className="font-mono text-xs">VP8L</code>,{" "}
									<code className="font-mono text-xs">ALPH</code>,{" "}
									<code className="font-mono text-xs">ANIM</code>,{" "}
									<code className="font-mono text-xs">ANMF</code>, and{" "}
									<strong className="text-(--text-primary)">
										<code className="font-mono text-xs">ICCP</code>
									</strong>{" "}
									(keeps <code className="font-mono text-xs">0x20</code> bit in{" "}
									<code className="font-mono text-xs">VP8X</code>) when enabled
								</td>
							</tr>
							<tr>
								<th
									scope="row"
									className="py-3.5 pr-4 font-mono font-bold text-(--text-primary)"
								>
									HEIC / AVIF (ISOBMFF)
								</th>
								<td className="px-4 py-3.5">
									<code className="font-mono text-xs">Exif</code> items,{" "}
									<code className="font-mono text-xs">mime</code> XMP items,{" "}
									<code className="font-mono text-xs">c2pa</code> /{" "}
									<code className="font-mono text-xs">jumb</code> boxes &amp;
									UUIDs, <code className="font-mono text-xs">iref</code> links,
									zero-wiped <code className="font-mono text-xs">mdat</code>{" "}
									extents, and trailing bytes
								</td>
								<td className="py-3.5 pl-4">
									<code className="font-mono text-xs">ftyp</code>,{" "}
									<code className="font-mono text-xs">hdlr</code>,{" "}
									<code className="font-mono text-xs">pitm</code>, image{" "}
									<code className="font-mono text-xs">mdat</code> bitstreams
									(with updated <code className="font-mono text-xs">iloc</code>{" "}
									offsets), and{" "}
									<strong className="text-(--text-primary)">
										<code className="font-mono text-xs">colr</code> (ICC)
									</strong>{" "}
									when enabled
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			{/* Honest Technical Scope */}
			<section className="grid gap-4 md:grid-cols-2">
				<div className="rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6">
					<h2 className="m-0 mb-3 text-base font-semibold text-(--success-color)">
						Completely removed (File metadata)
					</h2>
					<ul className="m-0 space-y-2 pl-5 text-sm leading-relaxed text-(--text-secondary)">
						<li>
							<strong className="text-(--text-primary)">
								C2PA / Content Credentials:
							</strong>{" "}
							JUMBF boxes (<code className="font-mono text-xs">caBX</code>,{" "}
							<code className="font-mono text-xs">APP11</code>,{" "}
							<code className="font-mono text-xs">C2PA</code>) carrying
							provenance manifests and generator signatures.
						</li>
						<li>
							<strong className="text-(--text-primary)">
								AI Prompt &amp; Workflow Chunks:
							</strong>{" "}
							Stable Diffusion{" "}
							<code className="font-mono text-xs">parameters</code>, ComfyUI
							JSON graphs, and XMP{" "}
							<code className="font-mono text-xs">DigitalSourceType</code> tags.
						</li>
						<li>
							<strong className="text-(--text-primary)">
								Personal &amp; Device EXIF / IPTC:
							</strong>{" "}
							GPS coordinates, camera serial numbers, lens model, timestamps,
							creator software, and trailing bytes.
						</li>
					</ul>
				</div>

				<div className="rounded-2xl border border-(--border-color) bg-(--bg-surface) p-6">
					<h2 className="m-0 mb-3 text-base font-semibold text-(--warning-color)">
						Not removed (Pixel watermarks)
					</h2>
					<ul className="m-0 space-y-2 pl-5 text-sm leading-relaxed text-(--text-secondary)">
						<li>
							<strong className="text-(--text-primary)">
								Imperceptible Pixel Watermarks:
							</strong>{" "}
							Signals such as{" "}
							<strong className="text-(--text-primary)">Google SynthID</strong>{" "}
							or{" "}
							<strong className="text-(--text-primary)">
								Stable Signature
							</strong>{" "}
							are embedded directly into pixel patterns to survive metadata
							stripping and re-encoding.
						</li>
						<li>
							<strong className="text-(--text-primary)">
								Visual AI Classifiers:
							</strong>{" "}
							Platforms may inspect visual characteristics independently of file
							metadata.
						</li>
						<li>
							<strong className="text-(--text-primary)">
								Platform Disclosure Policies:
							</strong>{" "}
							Always follow platform rules requiring disclosure of realistic AI
							media.
						</li>
					</ul>
				</div>
			</section>
		</div>
	);
}
