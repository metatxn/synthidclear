import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { Footer } from "#/components/Footer";
import { Header } from "#/components/Header";
import { initCopyCommandListener } from "#/lib/copyCommands";
import { initThemeSync, THEME_INIT_SCRIPT } from "#/lib/theme";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				name: "color-scheme",
				content: "light dark",
			},
			{
				title: "SynthIDClear — Remove Hidden AI Tags from Photos & Videos",
			},
			{
				name: "description",
				content:
					"Remove AI tags, C2PA, prompts, GPS, and camera data from PNG, JPEG, WebP, HEIC, AVIF, MP4, and MOV files locally in your browser with zero quality loss.",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml",
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				sizes: "32x32",
			},
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon.png",
				sizes: "180x180",
			},
			{
				rel: "manifest",
				href: "/site.webmanifest",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	component: RootLayout,
	shellComponent: RootDocument,
});

function RootLayout() {
	useEffect(() => {
		initCopyCommandListener();
		initThemeSync();
	}, []);

	return (
		<div className="flex min-h-screen flex-col bg-(--bg-canvas) text-(--text-primary)">
			<Header />
			<main id="main-content" className="flex-1">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<meta
					name="theme-color"
					content="#F6F5F1"
					media="(prefers-color-scheme: light)"
				/>
				<meta
					name="theme-color"
					content="#111110"
					media="(prefers-color-scheme: dark)"
				/>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Static FOUC-prevention script reading localStorage color-scheme
					dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
				/>
			</head>
			<body>
				{children}
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "TanStack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
