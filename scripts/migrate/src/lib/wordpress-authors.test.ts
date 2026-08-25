import { describe, expect, it } from "vitest";

import { extractAuthorsFromHtml } from "./wordpress-authors";

describe("extractAuthorsFromHtml", () => {
	it("reads a single author from a byline", () => {
		expect(extractAuthorsFromHtml("<p>Written by: Jane Doe</p><p>Body text.</p>")).toEqual([
			"Jane Doe",
		]);
	});

	it("accepts the byline variants editors used", () => {
		for (const byline of ["Written by Jane Doe", "By Jane Doe", "Lead author: Jane Doe"]) {
			expect(extractAuthorsFromHtml(`<p>${byline}</p>`)).toEqual(["Jane Doe"]);
		}
	});

	it("splits multiple authors", () => {
		expect(extractAuthorsFromHtml("<p>Written by Jane Doe and John Smith</p>")).toEqual([
			"Jane Doe",
			"John Smith",
		]);
	});

	it("keeps particles and initials", () => {
		expect(extractAuthorsFromHtml("<p>Written by Jan van Dijk & Mary J. Smith</p>")).toEqual([
			"Jan van Dijk",
			"Mary J. Smith",
		]);
	});

	it("drops the affiliation trailing the name", () => {
		expect(extractAuthorsFromHtml("<p>Written by Jane Doe (University of Vienna)</p>")).toEqual([
			"Jane Doe",
		]);
		expect(extractAuthorsFromHtml("<p>Written by Jane Doe, DARIAH-EU</p>")).toEqual(["Jane Doe"]);
	});

	it("falls back to the lines following a bare byline", () => {
		expect(extractAuthorsFromHtml("<p>Written by</p><p>Jane Doe</p>")).toEqual(["Jane Doe"]);
	});

	it("returns nothing when there is no byline", () => {
		expect(extractAuthorsFromHtml("<p>An article without an author.</p>")).toEqual([]);
	});

	it("returns nothing when the byline names an organisation rather than a person", () => {
		expect(extractAuthorsFromHtml("<p>Written by the DARIAH Coordination Office</p>")).toEqual([]);
	});

	it("returns nothing for a corporate byline naming a working group", () => {
		// https://www.dariah.eu/activities/spotlight/wg-dhwiki-collaborative-approaches-to-sustainable-community%e2%80%91driven-open-knowledge-infrastructures/
		expect(
			extractAuthorsFromHtml(
				'<h4><strong>By WG members of <a href="https://www.dariah.eu/activities/working-groups/dhwiki/">DHwiki</a></strong></h4>',
			),
		).toEqual([]);
	});
});
