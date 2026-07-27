import { describe, expect, it } from "vitest";

import { getEntityHref } from "./index";
import { interimPagePathBySlug, resolveInterimPagePath } from "./interim-page-paths";

describe("resolveInterimPagePath", () => {
	it("maps known section-page slugs to their current website pathname (per issue #703)", () => {
		expect(resolveInterimPagePath("strategy")).toBe("/about/strategy");
		expect(resolveInterimPagePath("join-dariah")).toBe("/get-involved/join-dariah");
		expect(resolveInterimPagePath("regional-hubs")).toBe("/network/regional-hubs");
		// Slugs that deliberately differ from the path leaf — the reason a hardcoded map is needed.
		expect(resolveInterimPagePath("dariah-in-nutshell")).toBe("/about/dariah-in-a-nutshell");
		expect(resolveInterimPagePath("working-groups-list")).toBe("/network/working-groups");
		// Footer legal pages are CMS `page` entities.
		expect(resolveInterimPagePath("legal-notice")).toBe("/privacy-and-legal/legal-notice");
	});

	it("returns null for pages with no known route (callers must skip them)", () => {
		expect(resolveInterimPagePath("some-unrouted-page")).toBeNull();
		// Unresolved target in #703 — intentionally excluded.
		expect(resolveInterimPagePath("partnerships-and-collaborations")).toBeNull();
		// The footer privacy-notice link no longer exists on the website.
		expect(resolveInterimPagePath("privacy-notice")).toBeNull();
	});

	it("feeds getEntityHref verbatim (the interim path is the final page pathname)", () => {
		const path = resolveInterimPagePath("strategy");
		expect(path).not.toBeNull();
		expect(getEntityHref({ type: "page", path: path! })).toBe("/about/strategy");
	});

	it("every interim path is root-relative", () => {
		for (const path of Object.values(interimPagePathBySlug)) {
			expect(path).toMatch(/^\/[^/]/u);
		}
	});
});
