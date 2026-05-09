import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

test.describe("website news lifecycle", () => {
	test.describe.configure({ mode: "default" });

	test.beforeAll(async ({ db }) => {
		await db.getTestAsset();
	});

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerNewsLifecycleItems(testInfo.workerIndex);
	});

	test("draft → publish → discard draft", async ({ page, createWebsiteNewsPage }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Lifecycle ${randomUUID()}`;

		// Create — item starts in draft state.
		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("Lifecycle test summary");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.submitForm();

		// List: draft badge visible.
		await newsPage.searchByTitle(title);
		await expect(newsPage.draftBadgeInRow(title)).toBeVisible();

		// Details: "Draft" badge, Publish button, no Discard button.
		await newsPage.gotoDetailsFromList(title);
		await expect(newsPage.detailsDraftBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeHidden();

		// Publish → redirected to list.
		await newsPage.publishItem();

		// List: live badge visible (published version now exists).
		await newsPage.searchByTitle(title);
		await expect(newsPage.liveBadgeInRow(title)).toBeVisible();

		// Details: draft and published versions both exist → "Live with changes" badge.
		await newsPage.gotoDetailsFromList(title);
		await expect(newsPage.detailsLiveWithChangesBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeVisible();

		// Discard draft → redirected to list.
		await newsPage.discardDraft();

		// List: still shows live badge (published version remains).
		await newsPage.searchByTitle(title);
		await expect(newsPage.liveBadgeInRow(title)).toBeVisible();

		// Details: published-only → "Live" badge, no Discard, no version selector.
		await newsPage.gotoDetailsFromList(title);
		await expect(newsPage.detailsLiveBadge()).toBeVisible();
		await expect(page.getByRole("button", { name: "Publish" })).toBeHidden();
		await expect(page.getByRole("button", { name: "Discard draft" })).toBeHidden();
		await expect(newsPage.versionSelectorDraftLink()).toBeHidden();
	});

	test("version selector shows correct content per version", async ({
		page,
		createWebsiteNewsPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const originalTitle = `${newsPage.workerPrefix} Version A ${randomUUID()}`;

		// Create → Publish → Discard to reach a clean published-only state.
		await newsPage.gotoCreate();
		await newsPage.fillTitle(originalTitle);
		await newsPage.fillSummary("Version selector test");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.submitForm();

		await newsPage.searchByTitle(originalTitle);
		await newsPage.gotoDetailsFromList(originalTitle);
		await newsPage.publishItem();

		await newsPage.searchByTitle(originalTitle);
		await newsPage.gotoDetailsFromList(originalTitle);
		await newsPage.discardDraft();

		// From the published-only details page, click Edit.
		await newsPage.searchByTitle(originalTitle);
		await newsPage.gotoDetailsFromList(originalTitle);
		await expect(newsPage.detailsLiveBadge()).toBeVisible();
		await page.getByRole("link", { name: "Edit" }).click();
		await page.waitForURL("**/edit");

		// Update the title.
		const updatedTitle = `${newsPage.workerPrefix} Version B ${randomUUID()}`;
		const titleField = page.getByLabel("Name");
		await titleField.clear();
		await titleField.fill(updatedTitle);
		await newsPage.submitForm();

		// List: row appears under updated title with "Live" badge (isPublished still true).
		await newsPage.searchByTitle(updatedTitle);
		await expect(newsPage.liveBadgeInRow(updatedTitle)).toBeVisible();

		// Details: "Live with changes" — draft has new title, published has original.
		await newsPage.gotoDetailsFromList(updatedTitle);
		await expect(newsPage.detailsLiveWithChangesBadge()).toBeVisible();

		// Version selector is visible with both tabs.
		await expect(newsPage.versionSelectorDraftLink()).toBeVisible();
		await expect(newsPage.versionSelectorPublishedLink()).toBeVisible();

		// Currently on draft tab — updated title shown.
		await expect(page.getByText(updatedTitle)).toBeVisible();

		// Switch to published tab — original title shown.
		await newsPage.versionSelectorPublishedLink().click();
		await page.waitForURL((url) => {
			return url.searchParams.get("version") === "published";
		});
		await expect(page.getByText(originalTitle)).toBeVisible();
		await expect(page.getByText(updatedTitle)).toBeHidden();

		// Switch back to draft tab — updated title shown again.
		await newsPage.versionSelectorDraftLink().click();
		await page.waitForURL((url) => {
			return url.searchParams.get("version") == null;
		});
		await expect(page.getByText(updatedTitle)).toBeVisible();
	});
});
