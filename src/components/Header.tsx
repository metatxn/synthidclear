import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { toggleColorScheme } from "#/lib/theme";
import { BrandMark } from "./BrandMark";

const NAV_LINKS = [
	{ to: "/remove-c2pa-metadata", label: "AI Tags" },
	{ to: "/strip-exif-online", label: "EXIF & GPS" },
	{ to: "/png-prompt-remover", label: "PNG Prompts" },
	{ to: "/video-metadata-remover", label: "Video" },
	{ to: "/how-it-works", label: "How It Works" },
] as const;

export function Header() {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<header className="sticky top-0 z-40 border-b border-(--border-color) bg-(--bg-canvas)/95 backdrop-blur">
			<a href="#main-content" className="skip-link visually-hidden">
				Skip to main content
			</a>

			<div className="flex w-full items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8 md:grid md:grid-cols-[1fr_auto_1fr]">
				<Link
					to="/"
					className="flex items-center justify-self-start gap-2.5 text-base font-semibold tracking-tight text-(--text-primary) no-underline"
				>
					<BrandMark className="h-7 w-7 shrink-0" />
					<span>SynthIDClear</span>
				</Link>

				<nav
					aria-label="Primary"
					className="hidden items-center justify-self-center gap-1 md:flex"
				>
					<ul className="m-0 flex list-none items-center gap-1 p-0">
						{NAV_LINKS.map((item) => (
							<li key={item.to}>
								<Link
									to={item.to}
									activeProps={{
										className:
											"bg-(--bg-surface) text-(--text-primary) font-semibold",
									}}
									inactiveProps={{
										className:
											"text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface)/60",
									}}
									className="touch-target inline-flex items-center rounded-lg px-3 py-1.5 text-sm no-underline"
								>
									{item.label}
								</Link>
							</li>
						))}
					</ul>
				</nav>

				<div className="flex items-center justify-self-end gap-2">
					<button
						type="button"
						onClick={toggleColorScheme}
						className="theme-toggle touch-target inline-flex cursor-pointer items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-card) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) hover:border-(--text-primary) hover:text-(--text-primary)"
					>
						<span className="theme-to-dark items-center gap-1.5">
							<Moon className="h-3.5 w-3.5" aria-hidden="true" />
							<span className="hidden sm:inline">Dark</span>
							<span className="visually-hidden">Switch to dark theme</span>
						</span>
						<span className="theme-to-light items-center gap-1.5">
							<Sun className="h-3.5 w-3.5" aria-hidden="true" />
							<span className="hidden sm:inline">Light</span>
							<span className="visually-hidden">Switch to light theme</span>
						</span>
					</button>

					<button
						type="button"
						onClick={() => setMobileOpen((prev) => !prev)}
						aria-expanded={mobileOpen}
						aria-controls="mobile-nav-panel"
						aria-label={mobileOpen ? "Close menu" : "Open menu"}
						className="touch-target inline-flex cursor-pointer items-center justify-center rounded-lg border border-(--border-color) bg-(--bg-card) p-2 text-(--text-primary) md:hidden"
					>
						{mobileOpen ? (
							<X className="h-4 w-4" aria-hidden="true" />
						) : (
							<Menu className="h-4 w-4" aria-hidden="true" />
						)}
					</button>
				</div>
			</div>

			{mobileOpen && (
				<nav
					id="mobile-nav-panel"
					aria-label="Mobile"
					className="border-t border-(--border-color) bg-(--bg-surface) px-4 py-3 md:hidden"
				>
					<ul className="m-0 flex list-none flex-col gap-1 p-0">
						<li>
							<Link
								to="/"
								onClick={() => setMobileOpen(false)}
								activeProps={{
									className:
										"bg-(--bg-card) text-(--text-primary) font-semibold",
								}}
								inactiveProps={{
									className: "text-(--text-secondary)",
								}}
								className="touch-target flex items-center rounded-lg px-3 py-2 text-sm no-underline"
							>
								Image Cleaner
							</Link>
						</li>
						{NAV_LINKS.map((item) => (
							<li key={item.to}>
								<Link
									to={item.to}
									onClick={() => setMobileOpen(false)}
									activeProps={{
										className:
											"bg-(--bg-card) text-(--text-primary) font-semibold",
									}}
									inactiveProps={{
										className: "text-(--text-secondary)",
									}}
									className="touch-target flex items-center rounded-lg px-3 py-2 text-sm no-underline"
								>
									{item.label}
								</Link>
							</li>
						))}
					</ul>
				</nav>
			)}
		</header>
	);
}
