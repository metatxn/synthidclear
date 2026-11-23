import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Link,
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
				title: "SynthIDClear — Remove AI Metadata & EXIF (No Upload)",
			},
			{
				name: "description",
				content:
					"Free, private metadata cleaner for PNG, JPEG, WebP, HEIC, AVIF, MP4, MOV & PDF. Strip C2PA, AI tags, prompts & GPS locally in your browser with zero quality loss.",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
				sizes: "48x48",
			},
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml",
			},
			{
				rel: "icon",
				href: "/favicon-96x96.png",
				type: "image/png",
				sizes: "96x96",
			},
			{
				rel: "icon",
				href: "/favicon-48x48.png",
				type: "image/png",
				sizes: "48x48",
			},
			{
				rel: "icon",
				href: "/icon-192.png",
				type: "image/png",
				sizes: "192x192",
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
	notFoundComponent: RootNotFound,
	shellComponent: RootDocument,
});

function RootNotFound() {
	return (
		<div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
			<div className="w-full rounded-2xl border border-(--border-color) bg-(--bg-card) p-8">
				<p className="m-0 text-xs font-semibold tracking-[0.06em] text-(--brand-color) uppercase">
					404
				</p>
				<h1 className="mt-2 mb-3 text-2xl leading-tight font-semibold tracking-[-0.03em] text-(--text-primary)">
					Page not found
				</h1>
				<p className="m-0 mb-6 text-sm leading-relaxed text-(--text-secondary)">
					That page doesn&apos;t exist. Head back to the cleaner to inspect and
					strip hidden metadata locally in your browser.
				</p>
				<div className="flex flex-wrap items-center justify-center gap-2.5">
					<Link
						to="/"
						className="touch-target inline-flex items-center justify-center rounded-xl bg-(--brand-color) px-4 py-2.5 text-sm font-semibold text-(--brand-text) no-underline hover:bg-(--brand-hover)"
					>
						Go to SynthIDClear
					</Link>
					<Link
						to="/tools"
						className="touch-target inline-flex items-center justify-center rounded-xl border border-(--border-color) bg-(--bg-surface) px-4 py-2.5 text-sm font-semibold text-(--text-primary) no-underline hover:border-(--text-primary)"
					>
						All tools
					</Link>
				</div>
			</div>
		</div>
	);
}

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
