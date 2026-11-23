import { Link } from "@tanstack/react-router";
import { ArrowRight, FileImage, Lock, Sparkles, Upload } from "lucide-react";
import { type DragEvent, useId, useState } from "react";
import { ACCEPTED_MEDIA_ACCEPT, filterAcceptedMediaFiles } from "#/lib/format";
import type { CleanerState } from "#/lib/useCleanerState";
import { CleanerWorkspace } from "./CleanerWorkspace";

interface LandingHeroProps {
	cleaner: CleanerState;
}

export function LandingHero({ cleaner }: LandingHeroProps) {
	const inputId = useId();
	const [isDragging, setIsDragging] = useState(false);
	const hasFiles = cleaner.items.length > 0;

	function handleDragOver(e: DragEvent<HTMLElement>) {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
		if (!isDragging) setIsDragging(true);
	}

	function handleDragLeave(e: DragEvent<HTMLElement>) {
		if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
			setIsDragging(false);
		}
	}

	function handleDrop(e: DragEvent<HTMLElement>) {
		e.preventDefault();
		setIsDragging(false);
		const files = filterAcceptedMediaFiles(e.dataTransfer.files);
		if (files.length > 0) {
			void cleaner.handleFilesAdded(files);
		}
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const files = e.target.files ? Array.from(e.target.files) : [];
		if (files.length > 0) {
			void cleaner.handleFilesAdded(files);
		}
		e.target.value = "";
	}

	return (
		<section
			id="cleaner"
			aria-labelledby="hero-heading"
			className="bg-(--bg-canvas)"
		>
			<div
				className={`mx-auto px-4 text-center sm:px-6 ${
					hasFiles
						? "max-w-4xl pt-6 pb-10 lg:pt-8"
						: "max-w-3xl pt-12 pb-10 lg:pt-16"
				}`}
			>
				{!hasFiles && (
					<div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-(--border-color) bg-(--bg-card) px-3.5 py-1 text-xs font-medium text-(--text-secondary)">
						<Lock
							className="h-3.5 w-3.5 text-(--brand-color)"
							aria-hidden="true"
						/>
						<span>100% private · Runs in your browser · Nothing uploaded</span>
					</div>
				)}

				<h1
					id="hero-heading"
					className={`m-0 font-semibold tracking-[-0.03em] text-(--text-primary) ${
						hasFiles
							? "text-2xl leading-[1.15] sm:text-3xl"
							: "text-4xl leading-[1.08] sm:text-5xl"
					}`}
				>
					Remove hidden AI tags from photos &amp; videos.
				</h1>

				{!hasFiles && (
					<p className="mx-auto mt-4 mb-0 max-w-2xl text-base leading-relaxed text-(--text-secondary) sm:text-lg">
						Clean AI labels, saved prompts, and GPS location from PNG, JPEG,
						WebP, HEIC, AVIF, MP4, and MOV — free unlimited batch, original
						quality kept.
					</p>
				)}

				{hasFiles ? (
					<div className="mt-5">
						<CleanerWorkspace
							externalState={cleaner}
							hideDropzone
							hideScopeBanner
						/>
					</div>
				) : (
					/* Prominent Interactive Dropzone Card */
					<section
						aria-label="Upload photos or videos to clean hidden metadata"
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						className="mt-8 rounded-2xl border border-(--border-color) bg-(--bg-card) p-3 shadow-sm"
					>
						<div
							className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-10 transition-colors sm:py-12 ${
								isDragging
									? "border-(--brand-color) bg-(--brand-color)/10"
									: "border-(--border-color) bg-(--bg-canvas)/60 hover:border-(--text-muted)"
							}`}
						>
							<div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-(--border-color) bg-(--bg-surface) text-(--text-primary)">
								<Upload className="h-5 w-5" aria-hidden="true" />
							</div>

							<div className="space-y-1">
								<p className="m-0 text-base font-semibold text-(--text-primary)">
									Drop photos or videos here to clean
								</p>
								<p className="m-0 text-sm text-(--text-secondary)">
									PNG, JPEG, WebP, HEIC, AVIF, MP4, or MOV · Single file or
									batch
								</p>
							</div>

							<div className="flex flex-wrap items-center justify-center gap-3 pt-1">
								<div className="relative inline-flex">
									<input
										id={inputId}
										type="file"
										accept={ACCEPTED_MEDIA_ACCEPT}
										multiple
										onChange={handleFileChange}
										className="visually-hidden"
									/>
									<label
										htmlFor={inputId}
										className="touch-target inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-(--brand-color) px-6 py-2.5 text-sm font-semibold text-(--brand-text) hover:bg-(--brand-hover)"
									>
										<FileImage className="h-4 w-4" aria-hidden="true" />
										Choose Files
									</label>
								</div>

								<button
									type="button"
									onClick={cleaner.handleLoadSample}
									disabled={cleaner.isLoadingSample}
									className="touch-target inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-(--border-color) bg-(--bg-card) px-5 py-2.5 text-sm font-semibold text-(--text-primary) hover:border-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
								>
									<Sparkles
										className="h-4 w-4 text-(--brand-color)"
										aria-hidden="true"
									/>
									{cleaner.isLoadingSample
										? "Loading sample…"
										: "Try a Sample Image"}
								</button>
							</div>

							<p className="m-0 pt-1 text-xs text-(--text-muted)">
								Free &amp; unlimited · Works offline · Original colors &amp;
								quality kept
							</p>
						</div>
					</section>
				)}

				<Link
					to="/visible-icon-remover"
					className="touch-target mt-3 inline-flex items-center gap-1 text-sm font-semibold text-(--brand-color) no-underline hover:underline"
				>
					Remove a visible icon
					<ArrowRight className="h-4 w-4" aria-hidden="true" />
				</Link>
			</div>
		</section>
	);
}
