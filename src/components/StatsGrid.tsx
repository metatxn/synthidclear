interface StatsGridProps {
	imagesLoaded: number;
	metadataEntriesFound: number;
	aiFlagsFound: number;
	cleanedVerified: number;
}

export function StatsGrid({
	imagesLoaded,
	metadataEntriesFound,
	aiFlagsFound,
	cleanedVerified,
}: StatsGridProps) {
	const cards = [
		{
			label: "Files",
			value: imagesLoaded,
			accentClass: "text-(--text-primary)",
		},
		{
			label: "Hidden Items Found",
			value: metadataEntriesFound,
			accentClass: "text-(--text-primary)",
		},
		{
			label: "AI Tags",
			value: aiFlagsFound,
			accentClass:
				aiFlagsFound > 0 ? "text-(--brand-color)" : "text-(--text-primary)",
		},
		{
			label: "Ready to Download",
			value: cleanedVerified,
			accentClass:
				cleanedVerified > 0
					? "text-(--success-color)"
					: "text-(--text-primary)",
		},
	];

	return (
		<section aria-label="Batch summary">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{cards.map((card) => (
					<div
						key={card.label}
						className="rounded-xl border border-(--border-color) bg-(--bg-card) px-4 py-3"
					>
						<span className="block text-xs font-medium text-(--text-secondary)">
							{card.label}
						</span>
						<p
							className={`tabular mt-1 mb-0 text-xl font-semibold tracking-tight ${card.accentClass}`}
						>
							{card.value.toLocaleString()}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}
