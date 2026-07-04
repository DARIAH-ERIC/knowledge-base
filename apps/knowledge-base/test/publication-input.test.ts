import { describe, expect, it } from "vitest";

import {
	normalizeDoi,
	toPublicationValues,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_lib/publication-input";

describe("publication input", () => {
	it("normalizes DOI URLs and prefixes", () => {
		expect(normalizeDoi("https://doi.org/10.1234/Example ")).toBe("10.1234/example");
		expect(normalizeDoi("doi: 10.5555/ABC")).toBe("10.5555/abc");
		expect(normalizeDoi("  ")).toBeNull();
	});

	it("maps the basic form fields to canonical bibliography values", () => {
		const publicationDate = new Date("2025-06-12T00:00:00.000Z");
		expect(
			toPublicationValues({
				title: "  A publication  ",
				type: "journal_article",
				status: "published",
				publicationYear: 2025,
				publicationDate,
				abstract: " ",
				containerTitle: " Journal ",
				publisher: "",
				doi: "https://doi.org/10.1234/Test",
				url: " https://example.org/article ",
				creatorNames: "Ada Lovelace\n\nGrace Hopper",
				keywordsText: "digital humanities, infrastructure, ",
			}),
		).toEqual({
			title: "A publication",
			type: "journal_article",
			status: "published",
			publicationYear: 2025,
			publicationDate,
			abstract: null,
			containerTitle: "Journal",
			publisher: null,
			doi: "10.1234/test",
			url: "https://example.org/article",
			creators: [{ literal: "Ada Lovelace" }, { literal: "Grace Hopper" }],
			keywords: ["digital humanities", "infrastructure"],
		});
	});
});
