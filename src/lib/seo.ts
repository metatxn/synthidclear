import type { FaqItem } from "#/components/FaqAccordion";

export const SITE_NAME = "SynthIDClear";
export const SITE_URL = "https://synthidclear.com";

interface RouteSeoOptions {
	title: string;
	description: string;
	path: string;
}

export function buildRouteHead({ title, description, path }: RouteSeoOptions) {
	const canonical = `${SITE_URL}${path === "/" ? "/" : path}`;
	const ogImage = `${SITE_URL}/og-image.png`;
	return {
		meta: [
			{ title },
			{ name: "description", content: description },
			{ name: "robots", content: "index, follow" },
			{ property: "og:type", content: "website" },
			{ property: "og:locale", content: "en_US" },
			{ property: "og:site_name", content: SITE_NAME },
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
			{ property: "og:url", content: canonical },
			{ property: "og:image", content: ogImage },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{
				property: "og:image:alt",
				content:
					"SynthIDClear — Remove hidden AI tags, C2PA, prompts, and GPS from photos & videos locally in your browser.",
			},
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: description },
			{ name: "twitter:image", content: ogImage },
		],
		links: [{ rel: "canonical", href: canonical }],
	};
}

export function buildWebsiteSchema() {
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Organization",
				"@id": `${SITE_URL}/#organization`,
				name: SITE_NAME,
				url: `${SITE_URL}/`,
				logo: {
					"@type": "ImageObject",
					url: `${SITE_URL}/icon-512.png`,
				},
			},
			{
				"@type": "WebSite",
				"@id": `${SITE_URL}/#website`,
				name: SITE_NAME,
				url: `${SITE_URL}/`,
				description:
					"100% browser-based metadata cleaner for photos and videos (PNG, JPEG, WebP, HEIC, AVIF, MP4, MOV) with zero uploads and lossless quality.",
				inLanguage: "en-US",
				publisher: {
					"@id": `${SITE_URL}/#organization`,
				},
			},
		],
	};
}

export function buildSoftwareAppSchema({
	name,
	description,
	path,
}: {
	name: string;
	description: string;
	path: string;
}) {
	return {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name,
		applicationCategory: "UtilitiesApplication",
		operatingSystem: "Any (Web Browser)",
		url: `${SITE_URL}${path === "/" ? "" : path}`,
		description,
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
		featureList: [
			"100% client-side browser processing with zero server uploads",
			"Lossless byte-level metadata stripping for PNG, JPEG, WebP, HEIC, AVIF, MP4, and MOV",
			"Removes C2PA / JUMBF Content Credentials, XMP DigitalSourceType, EXIF, GPS, IPTC, QuickTime tags, and PNG prompt chunks",
			"Preserves ICC color profiles (Display P3 / sRGB) by default",
			"Built-in binary re-scan verification confirming 0 metadata items remain",
		],
	};
}

export function buildFaqSchema(items: readonly FaqItem[]) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer,
			},
		})),
	};
}
