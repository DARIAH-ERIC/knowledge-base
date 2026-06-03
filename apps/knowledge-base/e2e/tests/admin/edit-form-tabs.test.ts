import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

/**
 * Regression guard for the entity edit form tabs.
 *
 * The edit form keeps every tab panel mounted and hides the inactive ones with CSS (`display:
 * none`) so that switching tabs preserves in-progress form state. A previous implementation hid
 * panels with React's `<Activity mode="hidden">` instead, which tears down the subtree's effects —
 * leaving react-aria controls (e.g. a `Select`) permanently non-interactive after the panel was
 * revealed again (the trigger focused but `aria-expanded` never flipped to `true`). These tests
 * fail if that regression is ever reintroduced.
 *
 * Note: the interactivity break only reproduces in a production build, which is what the CI e2e job
 * runs against.
 */
test.describe("edit form tab switching", () => {
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerGovernanceBodies(testInfo.workerIndex);
	});

	test("preserves uncontrolled field state and keeps react-aria selects interactive", async ({
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
		const roleTrigger = page
			.locator('[data-slot="control"]')
			.filter({ has: page.getByText("Role", { exact: true }) })
			.locator("button");
		await expect(roleTrigger).not.toContainText("Select an item");
		const selectedRole = ((await roleTrigger.textContent()) ?? "").trim();
		expect(selectedRole).not.toBe("");

		// Switch away and back. The panels stay mounted (hidden via CSS), so this must lose neither the
		// form state nor the controls' interactivity.
		await governanceBodiesPage.goToRelationsTab();
		await governanceBodiesPage.goToPeopleTab();

		// The react-aria Select kept its selected value across the round trip.
		await expect(roleTrigger).toContainText(selectedRole);

		// ...and is still interactive: clicking it opens the listbox. With `<Activity>` the handler was
		// gone and `aria-expanded` stayed `false`, so this is the core regression assertion.
		await roleTrigger.click();
		await expect(roleTrigger).toHaveAttribute("aria-expanded", "true");
		await expect(page.getByRole("option").first()).toBeVisible();
		await page.keyboard.press("Escape");

		// The uncontrolled text field on the Details tab kept its in-progress value.
		await governanceBodiesPage.goToDetailsTab();
		await expect(page.getByLabel("Acronym")).toHaveValue(acronymValue);
	});
});
