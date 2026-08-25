/**
 * WordPress posts live at date permalinks — `https://www.dariah.eu/2025/06/13/<slug>/` — so an
 * event whose `website` has that shape is not pointing at the event's own site but at the news post
 * announcing it. This returns the news slug for such a URL, and `null` for everything else: an
 * external event site, `dariah.eu/activities/annual-event/` (a website page, not a post), or
 * `annualevent.dariah.eu` (a separate site).
 */
export function getNewsAnnouncementSlug(website: string): string | null {
	let url;

	try {
		url = new URL(website);
	} catch {
		return null;
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return null;
	}

	if (url.hostname !== "dariah.eu" && url.hostname !== "www.dariah.eu") {
		return null;
	}

	const segments = url.pathname.split("/").filter((segment) => segment !== "");

	if (segments.length !== 4) {
		return null;
	}

	const [year, month, day, slug] = segments as [string, string, string, string];

	if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
		return null;
	}

	// Percent-encoded slugs do occur (non-ascii titles), and `entities.slug` stores the decoded form.
	try {
		return decodeURIComponent(slug);
	} catch {
		return slug;
	}
}
