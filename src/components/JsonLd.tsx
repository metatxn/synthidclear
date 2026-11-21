interface JsonLdProps {
	data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Structured JSON-LD schema from trusted static route data
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
		/>
	);
}
