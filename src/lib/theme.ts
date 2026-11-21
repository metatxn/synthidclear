export const THEME_STORAGE_KEY = "color-scheme";

/**
 * Minimal blocking inline script placed directly after `<meta name="color-scheme">`
 * to prevent FOUC when the user has pinned a theme override.
 */
export const THEME_INIT_SCRIPT =
	'try{var s=localStorage.getItem("color-scheme");if(s==="light"||s==="dark"){var m=document.querySelector(\'meta[name="color-scheme"]\');if(m)m.content=s;}}catch(e){}';

function readStoredScheme(): "light" | "dark" | null {
	try {
		const val = localStorage.getItem(THEME_STORAGE_KEY);
		return val === "light" || val === "dark" ? val : null;
	} catch {
		return null;
	}
}

function getSystemScheme(): "light" | "dark" {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyMetaScheme(content: "light" | "dark" | "light dark"): void {
	const meta = document.querySelector<HTMLMetaElement>(
		'meta[name="color-scheme"]',
	);
	if (meta) {
		meta.content = content;
	}
}

/**
 * Two-state header toggle: flips the currently rendered scheme.
 * Stores literal value when diverging from OS preference; removes key when reverting to system.
 */
export function toggleColorScheme(): void {
	if (typeof window === "undefined") return;

	const stored = readStoredScheme();
	const system = getSystemScheme();
	const rendered = stored ?? system;
	const target: "light" | "dark" = rendered === "dark" ? "light" : "dark";

	try {
		if (target !== system) {
			localStorage.setItem(THEME_STORAGE_KEY, target);
			applyMetaScheme(target);
		} else {
			localStorage.removeItem(THEME_STORAGE_KEY);
			applyMetaScheme("light dark");
		}
	} catch {
		applyMetaScheme(target);
	}
}

let syncInitialized = false;

export function initThemeSync(): void {
	if (typeof window === "undefined" || syncInitialized) return;
	syncInitialized = true;

	window.addEventListener("storage", (event) => {
		if (event.key !== THEME_STORAGE_KEY) return;
		const next =
			event.newValue === "light" || event.newValue === "dark"
				? event.newValue
				: "light dark";
		applyMetaScheme(next);
	});
}
