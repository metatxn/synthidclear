import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const HOST = "synthidclear.com";
const KEY = "a7c4e91f3b82d065e1f49a28c6d3b710";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

function extractSitemapUrls() {
	const sitemapPath = resolve(process.cwd(), "public/sitemap.xml");
	const xml = readFileSync(sitemapPath, "utf8");
	return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1].trim());
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const customPaths = args.filter((arg) => !arg.startsWith("--"));

	const urlList =
		customPaths.length > 0
			? customPaths.map((p) =>
					p.startsWith("http")
						? p
						: `https://${HOST}${p.startsWith("/") ? p : `/${p}`}`,
				)
			: extractSitemapUrls();

	if (urlList.length === 0) {
		console.error("No URLs found to submit to IndexNow.");
		process.exit(1);
	}

	const payload = {
		host: HOST,
		key: KEY,
		keyLocation: KEY_LOCATION,
		urlList,
	};

	if (dryRun) {
		console.log("IndexNow dry run payload:");
		console.log(JSON.stringify(payload, null, 2));
		return;
	}

	console.log(`Submitting ${urlList.length} URL(s) to IndexNow (${ENDPOINT})…`);
	const res = await fetch(ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=utf-8" },
		body: JSON.stringify(payload),
	});

	if (res.status === 200 || res.status === 202) {
		console.log(
			`IndexNow accepted ${urlList.length} URL(s) (HTTP ${res.status}).`,
		);
		return;
	}

	const body = await res.text();
	console.error(`IndexNow submission failed (HTTP ${res.status}): ${body}`);
	process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
