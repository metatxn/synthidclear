export interface PlatformGuideEntry {
	to:
		| "/instagram-ai-label"
		| "/tiktok-ai-label"
		| "/chatgpt-image-metadata"
		| "/sora-video-metadata"
		| "/gemini-image-metadata"
		| "/photoshop-ai-metadata"
		| "/midjourney-metadata"
		| "/veo-video-metadata";
	title: string;
	subtitle: string;
	group: "social" | "generator";
}

export const PLATFORM_GUIDES: readonly PlatformGuideEntry[] = [
	{
		to: "/instagram-ai-label",
		title: "Instagram AI Info Label",
		subtitle: "Check what triggered the label",
		group: "social",
	},
	{
		to: "/tiktok-ai-label",
		title: "TikTok AI-Generated Label",
		subtitle: "Find C2PA in videos and photos",
		group: "social",
	},
	{
		to: "/chatgpt-image-metadata",
		title: "ChatGPT Image Metadata",
		subtitle: "Read and remove OpenAI's C2PA",
		group: "generator",
	},
	{
		to: "/gemini-image-metadata",
		title: "Gemini & Imagen Metadata",
		subtitle: "XMP/C2PA tags vs. SynthID pixels",
		group: "generator",
	},
	{
		to: "/photoshop-ai-metadata",
		title: "Photoshop & Firefly AI Tags",
		subtitle: "Remove AI tags while keeping EXIF",
		group: "generator",
	},
	{
		to: "/midjourney-metadata",
		title: "Midjourney Image Metadata",
		subtitle: "Prompts, job IDs, and AI source tags",
		group: "generator",
	},
	{
		to: "/sora-video-metadata",
		title: "Sora Video Metadata",
		subtitle: "What a Sora MP4 carries",
		group: "generator",
	},
	{
		to: "/veo-video-metadata",
		title: "Google Veo Video Metadata",
		subtitle: "MP4 metadata vs. SynthID watermarks",
		group: "generator",
	},
] as const;

export type PlatformGuidePath = PlatformGuideEntry["to"];
