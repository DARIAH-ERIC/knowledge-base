import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("website funding calls lifecycle", () => {
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerFundingCallsLifecycleItems(testInfo.workerIndex);
	});

	test("draft → publish → edit → discard draft", async ({
		page,
		createWebsiteFundingCallsPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const fundingCallsPage = createWebsiteFundingCallsPage(workerIndex);

		const title = `${fundingCallsPage.workerPrefix} Lifecycle ${randomUUID()}`;

		// Create — item starts in draft state.
		await fundingCallsPage.gotoCreate();
		await fundingCallsPage.fillTitle(title);
		await fundingCallsPage.fillDatePicker("Start date", 2025, 6, 1);
		await fundingCallsPage.submitForm();

		// List: draft badge visible.
		await fundingCallsPage.searchByTitle(title);
		await expect(fundingCallsPage.draftBadgeInRow(title)).toBeVisible();
		await expect(fundingCallsPage.publishedBadgeInRow(title)).toBeHidden();

		// Details: "Draft" badge, Publish button, no Discard button.
		await fundingCallsPage.gotoDetailsFromList(title);
		await expect(fundingCallsPage.detailsDraftBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeHidden();

		// Publish → redirected to list.
		await fundingCallsPage.publishItem();

		// List: row reads as published-only right after publish.
		await fundingCallsPage.searchByTitle(title);
		await expect(fundingCallsPage.publishedBadgeInRow(title)).toBeVisible();
		await expect(fundingCallsPage.draftBadgeInRow(title)).toBeHidden();

		// Details: clean published-only state.
		await fundingCallsPage.gotoDetailsFromList(title);
		await expect(fundingCallsPage.detailsPublishedBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeHidden();
		await expect(fundingCallsPage.versionSelectorDraftLink()).toBeHidden();

		// Edit the draft — title change diverges draft from published.
		await page.getByRole("link", { name: "Edit" }).click();
		await page.waitForURL("**/edit");
		const titleField = page.getByLabel("Title");
		await titleField.clear();
		await titleField.fill(`${title} Edited`);
		await fundingCallsPage.submitForm();

		// List: both badges now visible.
		await fundingCallsPage.searchByTitle(`${title} Edited`);
		await expect(fundingCallsPage.publishedBadgeInRow(`${title} Edited`)).toBeVisible();
		await expect(fundingCallsPage.draftBadgeInRow(`${title} Edited`)).toBeVisible();

		// Details: "Published with draft changes" + Discard.
		await fundingCallsPage.gotoDetailsFromList(`${title} Edited`);
		await expect(fundingCallsPage.detailsPublishedWithDraftChangesBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeVisible();

		// Discard draft → redirected to list.
		await fundingCallsPage.discardDraft();

		// List: only published remains (original title restored).
		await fundingCallsPage.searchByTitle(title);
		await expect(fundingCallsPage.publishedBadgeInRow(title)).toBeVisible();
		await expect(fundingCallsPage.draftBadgeInRow(title)).toBeHidden();

		// Details: "Published" only, no Discard, no version selector.
		await fundingCallsPage.gotoDetailsFromList(title);
		await expect(fundingCallsPage.detailsPublishedBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeHidden();
		await expect(fundingCallsPage.versionSelectorDraftLink()).toBeHidden();
	});

	test("version selector shows correct content per version", async ({
		page,
		createWebsiteFundingCallsPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const fundingCallsPage = createWebsiteFundingCallsPage(workerIndex);

		const originalTitle = `${fundingCallsPage.workerPrefix} Original ${randomUUID()}`;
		const updatedTitle = `${fundingCallsPage.workerPrefix} Updated ${randomUUID()}`;

		// Create → Publish.
		await fundingCallsPage.gotoCreate();
		await fundingCallsPage.fillTitle(originalTitle);
		await fundingCallsPage.fillDatePicker("Start date", 2025, 6, 1);
		await fundingCallsPage.submitForm();

		await fundingCallsPage.searchByTitle(originalTitle);
		await fundingCallsPage.gotoDetailsFromList(originalTitle);
		await fundingCallsPage.publishItem();

		// From the published-only details page, click Edit and update the title.
		await fundingCallsPage.searchByTitle(originalTitle);
		await fundingCallsPage.gotoDetailsFromList(originalTitle);
		await expect(fundingCallsPage.detailsPublishedBadge()).toBeVisible();
		await page.getByRole("link", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		const titleField = page.getByLabel("Title");
		await titleField.clear();
		await titleField.fill(updatedTitle);
		await fundingCallsPage.submitForm();

		// Details: "Published with draft changes" with version selector.
		await fundingCallsPage.searchByTitle(updatedTitle);
		await fundingCallsPage.gotoDetailsFromList(updatedTitle);
		await expect(fundingCallsPage.detailsPublishedWithDraftChangesBadge()).toBeVisible();
		await expect(fundingCallsPage.versionSelectorDraftLink()).toBeVisible();
		await expect(fundingCallsPage.versionSelectorPublishedLink()).toBeVisible();

		// Currently on draft tab — updated title shown.
		await expect(page.getByText(updatedTitle)).toBeVisible();

		// Switch to published tab — original title shown.
		await fundingCallsPage.versionSelectorPublishedLink().click();
		await page.waitForURL((url) => url.searchParams.get("version") === "published");
		await expect(page.getByText(originalTitle)).toBeVisible();
		await expect(page.getByText(updatedTitle)).toBeHidden();

		// Switch back to draft tab — updated title shown again.
		await fundingCallsPage.versionSelectorDraftLink().click();
		await page.waitForURL((url) => url.searchParams.get("version") == null);
		await expect(page.getByText(updatedTitle)).toBeVisible();
	});
});
