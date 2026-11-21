export const PLATFORM_GUIDES = [
	{
		to: "/instagram-ai-label" as const,
		title: "Instagram AI Info Label",
		subtitle: "Check what triggered the label",
	},
	{
		to: "/tiktok-ai-label" as const,
		title: "TikTok AI-Generated Label",
		subtitle: "Find C2PA in videos and photos",
	},
	{
		to: "/chatgpt-image-metadata" as const,
		title: "ChatGPT Image Metadata",
		subtitle: "Read and remove OpenAI's C2PA",
	},
	{
		to: "/sora-video-metadata" as const,
		title: "Sora Video Metadata",
		subtitle: "What a Sora MP4 carries",
	},
];

export type PlatformGuidePath = (typeof PLATFORM_GUIDES)[number]["to"];
