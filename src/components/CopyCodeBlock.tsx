import { Check, Copy } from "lucide-react";
import { useId } from "react";

interface CopyCodeBlockProps {
	label: string;
	code: string;
	ariaLabel: string;
}

export function CopyCodeBlock({ label, code, ariaLabel }: CopyCodeBlockProps) {
	const rawId = useId();
	const codeId = `code-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

	const invokerProps = {
		command: "--copy",
		commandfor: codeId,
	} as Record<string, string>;

	return (
		<div className="code-surface overflow-hidden rounded-xl border border-[#2c2b27] bg-[#151513] text-[#f3f1ea]">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2c2b27] bg-[#1b1a17] px-4 py-2.5">
				<span className="text-xs font-medium text-[#b3afa5]">{label}</span>
				<span className="copy-wrapper">
					<button
						type="button"
						className="copy-btn"
						aria-label={ariaLabel}
						{...invokerProps}
					>
						<span className="icon-copy inline-flex items-center gap-1.5">
							<Copy className="h-3 w-3" aria-hidden="true" />
							<span>Copy</span>
						</span>
						<span className="icon-check inline-flex items-center gap-1.5">
							<Check className="h-3 w-3" aria-hidden="true" />
							<span>Copied</span>
						</span>
					</button>
					<output className="copy-tip" />
				</span>
			</div>
			<pre className="m-0 overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[#f3f1ea] sm:text-sm">
				<code id={codeId}>{code}</code>
			</pre>
		</div>
	);
}
