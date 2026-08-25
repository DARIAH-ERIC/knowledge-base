import { describe, expect, it } from "vitest";

import { getNewsAnnouncementSlug } from "./news-announcement-website";

describe("getNewsAnnouncementSlug", () => {
	it("reads the slug from a dariah.eu date permalink", () => {
		expect(
			getNewsAnnouncementSlug(
				"https://www.dariah.eu/2025/06/13/registration-for-friday-frontiers-autumn-series-2025-now-open/",
			),
		).toBe("registration-for-friday-frontiers-autumn-series-2025-now-open");
	});

	it("accepts the bare host, http, a missing trailing slash, and query strings", () => {
		for (const website of [
			"https://dariah.eu/2024/11/01/some-post/",
			"http://www.dariah.eu/2024/11/01/some-post/",
			"https://www.dariah.eu/2024/11/01/some-post",
			"https://www.dariah.eu/2024/11/01/some-post/?utm_source=newsletter",
			"https://www.dariah.eu/2024/11/01/some-post/#section",
		]) {
			expect(getNewsAnnouncementSlug(website)).toBe("some-post");
		}
	});

	it("decodes a percent-encoded slug, matching how `entities.slug` stores it", () => {
		expect(getNewsAnnouncementSlug("https://www.dariah.eu/2024/11/01/n%C3%A4chste-schritte/")).toBe(
			"nächste-schritte",
		);
	});

	it("ignores a dariah.eu page that is not a post permalink", () => {
		expect(getNewsAnnouncementSlug("https://www.dariah.eu/activities/annual-event/")).toBeNull();
		expect(
			getNewsAnnouncementSlug("https://www.dariah.eu/2024/11/01/some/deeper/path/"),
		).toBeNull();
		expect(getNewsAnnouncementSlug("https://www.dariah.eu/2024/11/some-post/")).toBeNull();
	});

	it("ignores other hosts, including dariah subdomains", () => {
		expect(getNewsAnnouncementSlug("https://annualevent.dariah.eu/")).toBeNull();
		expect(getNewsAnnouncementSlug("https://campus.dariah.eu/2024/11/01/some-post/")).toBeNull();
		expect(getNewsAnnouncementSlug("https://notdariah.eu/2024/11/01/some-post/")).toBeNull();
	});

	it("ignores anything that is not an http(s) url", () => {
		expect(getNewsAnnouncementSlug("dariah.eu/2024/11/01/some-post/")).toBeNull();
		expect(getNewsAnnouncementSlug("")).toBeNull();
	});
});
