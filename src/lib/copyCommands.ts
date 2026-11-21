/**
 * Global copy command handler following Invoker Commands (`command="--copy"` + `commandfor`)
 * with progressive fallback for browsers without CommandEvent, plus VoiceOver repeated-message dedup.
 */

let initialized = false;
let lastMessage = "";
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

function legacyCopy(text: string): boolean {
	const field = Object.assign(document.createElement("textarea"), {
		value: text,
	});
	field.setAttribute("readonly", "");
	field.style.cssText =
		"position:fixed;inset-block-start:0;opacity:0;pointer-events:none;";
	document.body.appendChild(field);
	field.select();
	try {
		return document.execCommand("copy");
	} catch {
		return false;
	} finally {
		field.remove();
	}
}

function reportCopyStatus(button: HTMLElement, ok: boolean): void {
	const tip = button.nextElementSibling;
	const existing = timers.get(button);
	if (existing) clearTimeout(existing);

	button.removeAttribute("data-copied");
	button.removeAttribute("data-failed");

	let message = ok ? "Copied" : "Copy failed";
	if (message === lastMessage) {
		message += "\u00A0";
	}
	lastMessage = message;

	if (tip) {
		tip.textContent = "";
	}
	void button.offsetWidth;
	button.setAttribute(ok ? "data-copied" : "data-failed", "");

	requestAnimationFrame(() => {
		if (tip) {
			tip.textContent = message;
		}
	});

	timers.set(
		button,
		setTimeout(() => {
			button.removeAttribute("data-copied");
			button.removeAttribute("data-failed");
			if (tip) {
				tip.textContent = "";
			}
		}, 2000),
	);
}

async function executeCopy(
	button: HTMLElement,
	target: HTMLElement,
): Promise<void> {
	const text =
		target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
			? target.value
			: // biome-ignore lint/performance/useDomNodeTextContent: innerText preserves rendered line breaks for copied code snippets
				target.innerText.trim();
	if (!text) return;

	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
		} else if (!legacyCopy(text)) {
			throw new Error("Copy failed");
		}
		reportCopyStatus(button, true);
	} catch {
		if (legacyCopy(text)) {
			reportCopyStatus(button, true);
		} else {
			reportCopyStatus(button, false);
		}
	}
}

interface CommandEventLike extends Event {
	command: string;
	source: HTMLElement | null;
}

export function initCopyCommandListener(): void {
	if (typeof window === "undefined" || initialized) return;
	initialized = true;

	if ("CommandEvent" in window) {
		document.addEventListener(
			"command",
			(event) => {
				const cmdEvent = event as CommandEventLike;
				if (
					cmdEvent.command?.startsWith("--copy") &&
					cmdEvent.source instanceof HTMLElement &&
					event.target instanceof HTMLElement
				) {
					void executeCopy(cmdEvent.source, event.target);
				}
			},
			true,
		);
	} else {
		document.addEventListener("click", (event) => {
			const targetEl = event.target;
			if (!(targetEl instanceof Element)) return;
			const button = targetEl.closest<HTMLElement>('button[command^="--copy"]');
			if (!button) return;
			const forId = button.getAttribute("commandfor");
			if (!forId) return;
			const target = document.getElementById(forId);
			if (target) {
				void executeCopy(button, target);
			}
		});
	}
}
