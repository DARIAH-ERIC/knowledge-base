import { randomUUID } from "node:crypto";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "@/e2e/lib/test";

/**
 * Regression guards for the entity edit form tabs.
 *
 * The edit form keeps every tab panel mounted and hides the inactive ones with CSS (`display:
 * none`) so that switching tabs preserves in-progress form state and keeps controls interactive. A
 * previous implementation hid panels with React's `<Activity mode="hidden">` instead, which tears
 * down the subtree's effects — leaving react-aria controls (e.g. a `Select`) permanently
 * non-interactive after the panel was hidden and revealed again (the trigger focused on click, but
 * `aria-expanded` never flipped to `true`, and it did not recover).
 *
 * Note: the interactivity break only reproduces in a production build, which is what the CI e2e job
 * runs against. It also only manifests on a control that is _first opened after_ the hide/reveal —
 * a control that was already interacted with before being hidden keeps working — so the
 * interactivity test below must not touch the select until after the round trip.
 */
function roleSelectTrigger(page: Page): Locator {
	return page
		.locator('[data-slot="control"]')
		.filter({ has: page.getByText("Role", { exact: true }) })
		.locator("button");
}

test.describe("edit form tab switching", () => {
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerGovernanceBodies(testInfo.workerIndex);
	});

	test("keeps a react-aria select interactive after a tab is hidden and revealed", async ({
		page,
		createAdminGovernanceBodiesPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const governanceBodiesPage = createAdminGovernanceBodiesPage(workerIndex);
		const name = `${governanceBodiesPage.workerPrefix} Tab Interactivity ${randomUUID()}`;

		await governanceBodiesPage.gotoCreate();
		await governanceBodiesPage.fillName(name);
		await governanceBodiesPage.fillDescription("Description for tab interactivity test.");
		await governanceBodiesPage.submitForm();

		await governanceBodiesPage.gotoEditFromList(name);

		// Reveal the People tab, switch away, and reveal it again — WITHOUT touching the Role select.
		// This is the exact manual reproduction: the panel is hidden and then re-revealed.
		await governanceBodiesPage.goToPeopleTab();
		await governanceBodiesPage.goToRelationsTab();
		await governanceBodiesPage.goToPeopleTab();

		// The Role select must still open. With `<Activity>` the press handler is torn down on hide and
		// not restored on reveal, so clicking only focuses the trigger and `aria-expanded` stays "false".
		const roleTrigger = roleSelectTrigger(page);
		await roleTrigger.click();
		await expect(roleTrigger).toHaveAttribute("aria-expanded", "true");
		await expect(page.getByRole("option").first()).toBeVisible();
		await page.keyboard.press("Escape");
	});

	test("preserves in-progress form state across tab switches", async ({
		page,
		createAdminGovernanceBodiesPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const governanceBodiesPage = createAdminGovernanceBodiesPage(workerIndex);
		const name = `${governanceBodiesPage.workerPrefix} Tab State ${randomUUID()}`;

		await governanceBodiesPage.gotoCreate();
		await governanceBodiesPage.fillName(name);
		await governanceBodiesPage.fillDescription("Description for tab state test.");
		await governanceBodiesPage.submitForm();

		await governanceBodiesPage.gotoEditFromList(name);

		// Type into an uncontrolled text field (the acronym is a `defaultValue` input — its value lives
		// only in the DOM) on the Details tab. The form is NOT saved; this is purely in-progress state.
		const acronymValue = "E2EKEEP";
		await governanceBodiesPage.goToDetailsTab();
		await governanceBodiesPage.fillAcronym(acronymValue);

		// Pick a value in a react-aria Select on the People tab.
		await governanceBodiesPage.goToPeopleTab();
		await governanceBodiesPage.selectFirstPersonRole();
		const roleTrigger = roleSelectTrigger(page);
		await expect(roleTrigger).not.toContainText("Select an item");
		const selectedRole = ((await roleTrigger.textContent()) ?? "").trim();
		expect(selectedRole).not.toBe("");

		// Switch away and back — the panels stay mounted (hidden via CSS), so neither value is lost.
		await governanceBodiesPage.goToRelationsTab();
		await governanceBodiesPage.goToPeopleTab();

		// The react-aria Select kept its selected value across the round trip.
		await expect(roleTrigger).toContainText(selectedRole);

		// The uncontrolled text field on the Details tab kept its in-progress value (it would be lost if
		// the panel were unmounted instead of hidden).
		await governanceBodiesPage.goToDetailsTab();
		await expect(page.getByLabel("Acronym")).toHaveValue(acronymValue);
	});
});
