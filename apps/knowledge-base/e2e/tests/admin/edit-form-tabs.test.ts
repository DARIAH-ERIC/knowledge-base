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

	test("keeps react-aria selects interactive when their tab is revealed after another tab", async ({
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

		const roleTrigger = roleSelectTrigger(page);

		// Reproduce the flow that broke in CI: use a select on one tab, then reveal another tab and open
		// a *fresh* select there. With `<Activity>` the hidden panel's effects are torn down, so on reveal
		// the react-aria trigger has no press handler — clicking only focuses it and `aria-expanded`
		// stays "false". This is timing-sensitive (intermittent in headless Chromium and it does not
		// recover), and Activity re-processes effects on every reveal, so we repeat the cycle to make an
		// intermittent break very likely to be caught. `display: none` hiding keeps the handlers alive,
		// so every iteration must succeed.
		for (let iteration = 0; iteration < 8; iteration += 1) {
			// Open a select on the Relations tab (a dropped press handler here makes this time out).
			await governanceBodiesPage.goToRelationsTab();
			await governanceBodiesPage.selectFirstRelationType();

			// Reveal People and open its Role select fresh.
			await governanceBodiesPage.goToPeopleTab();
			await roleTrigger.click();
			await expect(roleTrigger).toHaveAttribute("aria-expanded", "true");
			await expect(page.getByRole("option").first()).toBeVisible();
			await page.keyboard.press("Escape");
		}
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
