import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("website opportunities lifecycle", () => {
	test.describe.configure({ mode: "default" });

	test.beforeAll(async ({ db }) => {
		await db.getOpportunitySource();
	});

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerOpportunitiesLifecycleItems(testInfo.workerIndex);
	});

	test("draft → publish → edit → discard draft", async ({
		page,
		createWebsiteOpportunitiesPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const opportunitiesPage = createWebsiteOpportunitiesPage(workerIndex);

		const title = `${opportunitiesPage.workerPrefix} Lifecycle ${randomUUID()}`;

		// Create — item starts in draft state.
		await opportunitiesPage.gotoCreate();
		await opportunitiesPage.fillTitle(title);
		await opportunitiesPage.selectFirstSource();
		await opportunitiesPage.fillDatePicker("Start date", 2025, 6, 1);
		await opportunitiesPage.submitForm();

		// List: draft badge visible.
		await opportunitiesPage.searchByTitle(title);
		await expect(opportunitiesPage.draftBadgeInRow(title)).toBeVisible();
		await expect(opportunitiesPage.publishedBadgeInRow(title)).toBeHidden();

		// Details: "Draft" badge, Publish button, no Discard button.
		await opportunitiesPage.gotoDetailsFromList(title);
		await expect(opportunitiesPage.detailsDraftBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeHidden();

		// Publish → redirected to list.
		await opportunitiesPage.publishItem();

		// List: row reads as published-only right after publish.
		await opportunitiesPage.searchByTitle(title);
		await expect(opportunitiesPage.publishedBadgeInRow(title)).toBeVisible();
		await expect(opportunitiesPage.draftBadgeInRow(title)).toBeHidden();

		// Details: clean published-only state.
		await opportunitiesPage.gotoDetailsFromList(title);
		await expect(opportunitiesPage.detailsPublishedBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeHidden();
		await expect(opportunitiesPage.versionSelectorDraftLink()).toBeHidden();

		// Edit the draft — title change diverges draft from published.
		await opportunitiesPage.gotoEditFromDetails();
		const titleField = page.getByLabel("Title");
		await titleField.clear();
		await titleField.fill(`${title} Edited`);
		await opportunitiesPage.submitForm();

		// List: both badges now visible.
		await opportunitiesPage.searchByTitle(`${title} Edited`);
		await expect(opportunitiesPage.publishedBadgeInRow(`${title} Edited`)).toBeVisible();
		await expect(opportunitiesPage.draftBadgeInRow(`${title} Edited`)).toBeVisible();

		// Details: "Published with draft changes" + Discard.
		await opportunitiesPage.gotoDetailsFromList(`${title} Edited`);
		await expect(opportunitiesPage.detailsPublishedWithDraftChangesBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeVisible();

		// Discard draft → redirected to list.
		await opportunitiesPage.discardDraft();

		// List: only published remains (original title restored).
		await opportunitiesPage.searchByTitle(title);
		await expect(opportunitiesPage.publishedBadgeInRow(title)).toBeVisible();
		await expect(opportunitiesPage.draftBadgeInRow(title)).toBeHidden();

		// Details: "Published" only, no Discard, no version selector.
		await opportunitiesPage.gotoDetailsFromList(title);
		await expect(opportunitiesPage.detailsPublishedBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeHidden();
		await expect(opportunitiesPage.versionSelectorDraftLink()).toBeHidden();
	});

	test("version selector shows correct content per version", async ({
		page,
		createWebsiteOpportunitiesPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const opportunitiesPage = createWebsiteOpportunitiesPage(workerIndex);

		const originalTitle = `${opportunitiesPage.workerPrefix} Original ${randomUUID()}`;
		const updatedTitle = `${opportunitiesPage.workerPrefix} Updated ${randomUUID()}`;

		// Create → Publish.
		await opportunitiesPage.gotoCreate();
		await opportunitiesPage.fillTitle(originalTitle);
		await opportunitiesPage.selectFirstSource();
		await opportunitiesPage.fillDatePicker("Start date", 2025, 6, 1);
		await opportunitiesPage.submitForm();

		await opportunitiesPage.searchByTitle(originalTitle);
		await opportunitiesPage.gotoDetailsFromList(originalTitle);
		await opportunitiesPage.publishItem();

		// From the published-only details page, click Edit and update the title.
		await opportunitiesPage.searchByTitle(originalTitle);
		await opportunitiesPage.gotoDetailsFromList(originalTitle);
		await expect(opportunitiesPage.detailsPublishedBadge()).toBeVisible();
		await opportunitiesPage.gotoEditFromDetails();

		const titleField = page.getByLabel("Title");
		await titleField.clear();
		await titleField.fill(updatedTitle);
		await opportunitiesPage.submitForm();

		// Details: "Published with draft changes" with version selector.
		await opportunitiesPage.searchByTitle(updatedTitle);
		await opportunitiesPage.gotoDetailsFromList(updatedTitle);
		await expect(opportunitiesPage.detailsPublishedWithDraftChangesBadge()).toBeVisible();
		await expect(opportunitiesPage.versionSelectorDraftLink()).toBeVisible();
		await expect(opportunitiesPage.versionSelectorPublishedLink()).toBeVisible();

		// Currently on draft tab — updated title shown.
		await expect(page.getByText(updatedTitle)).toBeVisible();

		// Switch to published tab — original title shown.
		await opportunitiesPage.versionSelectorPublishedLink().click();
		await page.waitForURL((url) => url.searchParams.get("version") === "published");
		await expect(page.getByText(originalTitle)).toBeVisible();
		await expect(page.getByText(updatedTitle)).toBeHidden();

		// Switch back to draft tab — updated title shown again.
		await opportunitiesPage.versionSelectorDraftLink().click();
		await page.waitForURL((url) => url.searchParams.get("version") == null);
		await expect(page.getByText(updatedTitle)).toBeVisible();
	});
});
