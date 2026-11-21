import { FileImage, Sparkles, Upload } from "lucide-react";
import { type DragEvent, useId, useState } from "react";
import { ACCEPTED_MEDIA_ACCEPT, filterAcceptedMediaFiles } from "#/lib/format";

interface UploadDropzoneProps {
	onFilesAdded: (files: File[]) => void;
	onLoadSample: () => void;
	isLoadingSample: boolean;
}

export function UploadDropzone({
	onFilesAdded,
	onLoadSample,
	isLoadingSample,
}: UploadDropzoneProps) {
	const inputId = useId();
	const [isDragging, setIsDragging] = useState(false);

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
			onFilesAdded(files);
		}
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const files = e.target.files ? Array.from(e.target.files) : [];
		if (files.length > 0) {
			onFilesAdded(files);
		}
		e.target.value = "";
	}

	return (
		<section
			aria-label="Upload photos or videos to clean hidden metadata"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-3"
		>
			<input
				id={inputId}
				type="file"
				accept={ACCEPTED_MEDIA_ACCEPT}
				multiple
				onChange={handleFileChange}
				className="visually-hidden"
			/>

			<div
				className={`flex flex-col items-center justify-center gap-3.5 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
					isDragging
						? "border-(--brand-color) bg-(--brand-color)/10"
						: "border-(--border-color) bg-(--bg-canvas)/50 hover:border-(--text-muted)"
				}`}
			>
				<div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-(--border-color) bg-(--bg-surface) text-(--text-primary)">
					<Upload className="h-5 w-5" aria-hidden="true" />
				</div>

				<div className="space-y-1">
					<p className="m-0 text-base font-semibold text-(--text-primary)">
						Drop PNG, JPEG, WebP, HEIC, AVIF, MP4, or MOV files here
					</p>
					<p className="m-0 text-xs text-(--text-secondary)">
						Runs 100% locally in your browser · Original quality &amp; colors
						kept
					</p>
				</div>

				<div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
					<label
						htmlFor={inputId}
						className="touch-target inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-(--brand-color) px-5 py-2.5 text-sm font-semibold text-(--brand-text) hover:bg-(--brand-hover)"
					>
						<FileImage className="h-4 w-4" aria-hidden="true" />
						Choose Files
					</label>

					<button
						type="button"
						onClick={onLoadSample}
						disabled={isLoadingSample}
						className="touch-target inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-(--border-color) bg-(--bg-card) px-4 py-2.5 text-sm font-semibold text-(--text-primary) hover:border-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Sparkles
							className="h-4 w-4 text-(--brand-color)"
							aria-hidden="true"
						/>
						{isLoadingSample ? "Loading sample…" : "Try a Sample Image"}
					</button>
				</div>
			</div>
		</section>
	);
}
