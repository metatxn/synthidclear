const SAFE_BLOB_URL_RE = /^blob:(?:https?:\/\/[^\s"'<>]+|null)\/[^\s"'<>]+$/i;

/**
 * Validates that a URL is a well-formed browser `blob:` object URL before
 * passing it to DOM `src` or `href` attributes. Rejects any other scheme
 * (such as `javascript:` or `data:`) and blocks HTML meta-characters.
 */
export function toSafeBlobUrl(
	value: string | null | undefined,
): string | undefined {
	if (!value?.startsWith("blob:")) return undefined;
	try {
		const parsed = new URL(value);
		if (parsed.protocol !== "blob:") return undefined;
		const match = SAFE_BLOB_URL_RE.exec(parsed.href);
		return match ? match[0] : undefined;
	} catch {
		return undefined;
	}
}
