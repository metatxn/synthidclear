import { useId } from "react";

export interface FaqItem {
	question: string;
	answer: string;
}

interface FaqAccordionProps {
	heading?: string;
	items: readonly FaqItem[];
	className?: string;
}

export function FaqAccordion({
	heading = "Frequently asked questions",
	items,
	className = "mt-14",
}: FaqAccordionProps) {
	const headingId = useId();

	return (
		<section
			className={`faq-accordion space-y-4 ${className}`}
			aria-labelledby={headingId}
		>
			<h2
				id={headingId}
				className="m-0 text-2xl font-semibold tracking-tight text-(--text-primary)"
			>
				{heading}
			</h2>

			<div className="space-y-2.5">
				{items.map((item) => (
					<details key={item.question}>
						<summary className="text-(--text-primary) hover:text-(--brand-color)">
							{item.question}
						</summary>
						<div className="px-6 pb-4 text-sm leading-relaxed text-(--text-secondary)">
							{item.answer}
						</div>
					</details>
				))}
			</div>
		</section>
	);
}
