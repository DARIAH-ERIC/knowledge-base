import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { imageSizeLimit } from "@/config/assets.config";
import { expect, test } from "@/e2e/lib/test";
import { formatFileSize } from "@/lib/format-file-size";

test.describe("website news admin", () => {
	/**
	 * Run sequentially within this file. Suites may run concurrently because test data is isolated by
	 * Playwright worker index.
	 */
	test.describe.configure({ mode: "default" });

	test.beforeAll(async ({ db }) => {
		/** Verify that global prerequisites exist. */
		await db.getTestAsset();
	});

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerNewsItems(testInfo.workerIndex);
		await db.cleanupWorkerAssets(testInfo.workerIndex);
	});

	test("should show an inline validation error when a required image is missing", async ({
		createWebsiteNewsPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		await newsPage.gotoCreate();
		await newsPage.fillTitle(`${newsPage.workerPrefix} Missing Image ${randomUUID()}`);
		await newsPage.fillSummary("E2E test news item without image");

		const saveButton = newsPage.page.getByRole("button", {
			name: /^Save(?! and publish\b).*$/,
		});
		await expect(saveButton).toBeEnabled();
		await saveButton.click();

		await expect(newsPage.page.getByText("Please select an image.")).toBeVisible();
	});

	test("should create a news item", async ({ createWebsiteNewsPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Test News ${randomUUID()}`;
		const summary = "E2E test news item summary";
		const testAsset = await db.getTestAsset();

		await newsPage.gotoCreate();

		await newsPage.fillTitle(title);
		await newsPage.fillSummary(summary);
		await newsPage.fillPublicationDate(2025, 1, 15);
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");

		await newsPage.submitForm();

		await newsPage.searchByTitle(title);
		await expect(newsPage.rowByTitle(title)).toBeVisible();

		const created = await db.getNewsItemByTitle(title);
		expect(created).toMatchObject({
			imageId: testAsset.id,
			publicationDate: new Date("2025-01-15T00:00:00.000Z"),
			summary,
		});
	});

	test("should create a news item with an uploaded image", async ({ createWebsiteNewsPage }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Uploaded Image News ${randomUUID()}`;
		const imageLabel = `${newsPage.workerPrefix} Uploaded Image ${randomUUID()}`;
		const filePath = join(process.cwd(), "public/android-chrome-192x192.png");

		await newsPage.gotoCreate();

		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with uploaded image");
		await newsPage.uploadImageFromMediaLibrary(filePath, imageLabel);

		await newsPage.submitForm();

		await newsPage.searchByTitle(title);
		await expect(newsPage.rowByTitle(title)).toBeVisible();
	});

	test("should replace a selected image when editing a news item", async ({
		createWebsiteNewsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Replace Image News ${randomUUID()}`;
		const imageLabel = `${newsPage.workerPrefix} Replacement Image ${randomUUID()}`;
		const filePath = join(process.cwd(), "public/android-chrome-192x192.png");

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with replaceable image");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.submitForm();

		const before = await db.getNewsItemByTitle(title);
		expect(before).not.toBeNull();

		await newsPage.searchByTitle(title);
		await newsPage.gotoEditFromList(title);
		await newsPage.uploadImageFromMediaLibrary(filePath, imageLabel);
		await newsPage.submitForm();

		const replacementAsset = await db.getAssetByLabel(imageLabel);
		expect(replacementAsset).not.toBeNull();
		const after = await db.getNewsItemByTitle(title);
		expect(after).not.toBeNull();
		expect(after!.imageId).toBe(replacementAsset!.id);
		expect(after!.imageId).not.toBe(before!.imageId);
	});

	test("should show an inline error for an oversized uploaded image", async ({
		createWebsiteNewsPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		await newsPage.gotoCreate();
		await newsPage.page.getByRole("button", { name: "Select image" }).click();

		const dialog = newsPage.page.getByRole("dialog", { name: "Media library" });
		await dialog.getByRole("tab", { name: "Upload" }).click();
		await dialog.locator('input[type="file"]').setInputFiles({
			name: "oversized.png",
			mimeType: "image/png",
			buffer: Buffer.alloc(imageSizeLimit + 1),
		});

		await expect(
			dialog.getByText(
				`The selected image is too large. Choose an image smaller than ${formatFileSize(
					imageSizeLimit,
				)}.`,
			),
		).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Upload" })).toBeDisabled();
	});

	test("should edit all news item form fields", async ({ page, createWebsiteNewsPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const originalTitle = `${newsPage.workerPrefix} Edit Me ${randomUUID()}`;
		const testAsset = await db.getTestAsset();
		await newsPage.gotoCreate();
		await newsPage.fillTitle(originalTitle);
		await newsPage.fillSummary("E2E test news item to be edited");
		await newsPage.fillPublicationDate(2025, 1, 15);
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.submitForm();

		await newsPage.searchByTitle(originalTitle);
		const row = newsPage.rowByTitle(originalTitle);
		await expect(row).toBeVisible();

		await row.getByRole("button", { name: "Open actions menu" }).click();
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		const updatedTitle = `${newsPage.workerPrefix} Updated ${randomUUID()}`;
		const updatedSummary = "Updated E2E test news item summary";
		await page.getByLabel("Title").fill(updatedTitle);
		await newsPage.fillSummary(updatedSummary);
		await newsPage.fillPublicationDate(2026, 2, 16);
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");

		await newsPage.submitForm();

		await newsPage.searchByTitle(updatedTitle);
		await expect(newsPage.rowByTitle(updatedTitle)).toBeVisible();
		await newsPage.searchByTitle(originalTitle);
		await expect(newsPage.rowByTitle(originalTitle)).toBeHidden();

		const updated = await db.getNewsItemByTitle(updatedTitle);
		expect(updated).toMatchObject({
			imageId: testAsset.id,
			publicationDate: new Date("2026-02-16T00:00:00.000Z"),
			summary: updatedSummary,
		});
	});

	test("should add, edit, and remove content blocks", async ({
		page,
		createWebsiteNewsPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Content Blocks ${randomUUID()}`;
		const firstBlockText = `First content block ${randomUUID()}`;
		const updatedBlockText = `Updated content block ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with content blocks");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.addContentBlock(firstBlockText);
		await newsPage.submitForm();

		let contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks).toHaveLength(1);
		expect(contentBlocks[0]!.type).toBe("rich_text");
		expect(JSON.stringify(contentBlocks[0]!.content)).toContain(firstBlockText);

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		await expect(page.getByText(firstBlockText)).toBeVisible();

		await newsPage.gotoEditFromDetails();
		await newsPage.updateContentBlockText(updatedBlockText);
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks).toHaveLength(1);
		expect(JSON.stringify(contentBlocks[0]!.content)).toContain(updatedBlockText);
		expect(JSON.stringify(contentBlocks[0]!.content)).not.toContain(firstBlockText);

		await newsPage.searchByTitle(title);
		await newsPage.gotoEditFromList(title);
		await newsPage.removeFirstContentBlock();
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks).toHaveLength(0);
	});

	test("should save an inline callout between two rich-text blocks", async ({
		page,
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const title = `${newsPage.workerPrefix} Inline Callout ${randomUUID()}`;
		const above = `Rich text above ${randomUUID()}`;
		const calloutTitle = `Important ${randomUUID()}`;
		const selectedCalloutWord = "Selectable";
		const calloutBody = `${selectedCalloutWord} callout body ${randomUUID()}`;
		const below = `Rich text below ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with an inline callout");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.addContentWithCallout({ above, below, body: calloutBody, title: calloutTitle });
		await newsPage.submitForm();

		let contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual([
			"rich_text",
			"callout",
			"rich_text",
		]);
		expect(contentBlocks.map(({ position }) => position)).toStrictEqual([0, 1, 2]);
		expect(JSON.stringify(contentBlocks[0]!.content)).toContain(above);
		expect(contentBlocks[1]).toMatchObject({
			calloutIntent: "warning",
			calloutTitle,
		});
		expect(JSON.stringify(contentBlocks[1]!.content)).toContain(calloutBody);
		expect(JSON.stringify(contentBlocks[2]!.content)).toContain(below);

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		await expect(page.getByRole("complementary", { name: calloutTitle })).toBeVisible();
		await expect(page.getByText(above)).toBeVisible();
		await expect(page.getByText(calloutTitle)).toBeVisible();
		await expect(page.getByText(calloutBody)).toBeVisible();
		await expect(page.getByText(below)).toBeVisible();

		await newsPage.gotoEditFromDetails();
		await newsPage.expectCalloutPointerEditing(calloutTitle, selectedCalloutWord);
		await newsPage.dragCalloutBeforeText(above);
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["callout", "rich_text"]);
		expect(contentBlocks.map(({ position }) => position)).toStrictEqual([0, 1]);
		expect(contentBlocks[0]).toMatchObject({
			calloutIntent: "warning",
			calloutTitle,
		});
		expect(JSON.stringify(contentBlocks[0]!.content)).toContain(calloutBody);
		expect(JSON.stringify(contentBlocks[1]!.content)).toContain(above);
		expect(JSON.stringify(contentBlocks[1]!.content)).toContain(below);

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		const calloutBox = await page.getByText(calloutTitle).boundingBox();
		const aboveBox = await page.getByText(above).boundingBox();
		const belowBox = await page.getByText(below).boundingBox();
		expect(calloutBox).not.toBeNull();
		expect(aboveBox).not.toBeNull();
		expect(belowBox).not.toBeNull();
		expect(calloutBox!.y).toBeLessThan(aboveBox!.y);
		expect(aboveBox!.y).toBeLessThan(belowBox!.y);
	});

	test("should insert a block mid-document from the slash command menu", async ({
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const title = `${newsPage.workerPrefix} Slash Menu ${randomUUID()}`;
		const above = `Rich text above ${randomUUID()}`;
		const calloutTitle = `Slash callout ${randomUUID()}`;
		const calloutBody = `Slash callout body ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item built with the slash command menu");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");

		await newsPage.addContentBlock(above);

		/** Escape has to close the menu without inserting, and leave the typed text alone. */
		await newsPage.startNewParagraph();
		await newsPage.expectSlashMenuKeyboardNavigation({
			query: "head",
			first: "Heading 2",
			second: "Heading 3",
		});
		await newsPage.clearCurrentParagraph();

		await newsPage.insertViaSlashMenu({ query: "callout", option: "Callout" });
		await newsPage.fillInlineCallout({ title: calloutTitle, body: calloutBody });

		await newsPage.submitForm();

		const contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["rich_text", "callout"]);
		expect(contentBlocks[1]).toMatchObject({ calloutTitle });
		expect(JSON.stringify(contentBlocks[1]!.content)).toContain(calloutBody);

		/**
		 * The point of the test: the `/callout` the author typed is consumed by the command, not left
		 * behind as literal text in the paragraph above it.
		 */
		const richText = JSON.stringify(contentBlocks[0]!.content);
		expect(richText).toContain(above);
		expect(richText).not.toContain("/callout");
		expect(richText).not.toContain("/head");
	});

	/**
	 * Regression: image `layout` was stored on the block and offered in the UI, but neither the
	 * `assetImage` node nor the merge/split seam carried it. Opening an entity dropped the layout and
	 * saving wrote the default back over it, so a floated image silently un-floated the first time
	 * anyone edited the page — without touching the image.
	 *
	 * The second save is the point of this test. Asserting only the first one passes even when
	 * loading is broken, because the editor still holds the layout the author just picked.
	 */
	test("should keep a floated image floated across an edit round trip", async ({
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const title = `${newsPage.workerPrefix} Image Layout ${randomUUID()}`;
		const text = `Rich text before the image ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with a floated image");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.addContentWithImage({ text, assetLabel: "E2E Test Asset" });
		await newsPage.setImageLayout("Float left");
		await newsPage.submitForm();

		let contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["rich_text", "image"]);
		expect(contentBlocks[1]).toMatchObject({ imageLayout: "float-start" });

		/** Re-open the editor and confirm the stored layout survived being loaded into the document. */
		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		await newsPage.gotoEditFromDetails();
		await newsPage.expectImageLayout("Float left");

		/** Save again without editing the image at all. */
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["rich_text", "image"]);
		expect(contentBlocks[1]).toMatchObject({ imageLayout: "float-start" });
	});

	/**
	 * `captionMode` is a sibling of `layout` on the same node, so it fails the same way if the
	 * merge/split seam forgets it. Override is the mode worth asserting: it is the only one that also
	 * carries a payload, so a dropped mode and a dropped caption are distinguishable.
	 */
	test("should keep an image caption override across an edit round trip", async ({
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const title = `${newsPage.workerPrefix} Image Caption ${randomUUID()}`;
		const text = `Rich text before the image ${randomUUID()}`;
		const captionText = `Custom caption ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with a custom image caption");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.addContentWithImage({ text, assetLabel: "E2E Test Asset" });
		await newsPage.setImageCaptionMode("Custom caption", captionText);
		await newsPage.submitForm();

		let contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks[1]).toMatchObject({ imageCaptionMode: "override" });

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		await newsPage.gotoEditFromDetails();
		await newsPage.expectImageCaptionMode("Custom caption");
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks[1]).toMatchObject({ imageCaptionMode: "override" });
	});

	/**
	 * Tables, document links, entity links and placeholder values all live inside a `rich_text` run.
	 * They are the features added most recently and the ones with the least coverage; each stores
	 * attributes that must survive the same load/save cycle image `layout` failed.
	 *
	 * Neither link kind stores an href — a document link stores the asset key and an entity link the
	 * document id, both resolved at read time. Asserting on the stored attributes rather than on a
	 * rendered url is the point: a regression that turned these back into plain hrefs would keep
	 * rendering correctly today and break the moment a slug or file changed.
	 */
	test("should preserve tables, link targets and placeholder values across an edit round trip", async ({
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const testEntity = await db.getTestEntity();
		const title = `${newsPage.workerPrefix} Richtext Features ${randomUUID()}`;
		const intro = `Intro paragraph ${randomUUID()}`;
		const headers: [string, string] = [`Term ${randomUUID()}`, `Meaning ${randomUUID()}`];
		const documentLinkText = `the guidelines ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item exercising richtext features");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.addContentWithRichTextFeatures({
			intro,
			headers,
			documentLinkText,
			documentLabel: "E2E Test Document",
			entityName: testEntity.name,
			placeholderLabel: "Number of member countries",
		});
		await newsPage.submitForm();

		const assertFeatures = async () => {
			const contentBlocks = await db.getNewsContentBlocksByTitle(title);
			expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["rich_text"]);

			const doc = JSON.stringify(contentBlocks[0]!.content);

			/** The table survived as a real table node with its header cells. */
			expect(doc).toContain('"type":"table"');
			expect(doc).toContain('"type":"tableHeader"');
			expect(doc).toContain(headers[0]);
			expect(doc).toContain(headers[1]);

			/** Both link kinds kept their reference rather than decaying to an href. */
			expect(doc).toContain('"targetKind":"asset"');
			expect(doc).toContain("documents/e2e-test-document");
			expect(doc).toContain('"targetKind":"entity"');
			expect(doc).toContain(testEntity.id);

			/** The placeholder stored its kind, not a rendered number. */
			expect(doc).toContain('"type":"placeholderValue"');
			expect(doc).toContain('"kind":"member_countries_count"');
		};

		await assertFeatures();

		/** Re-open and save untouched: the half of the round trip that dropped image `layout`. */
		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		await newsPage.gotoEditFromDetails();
		await newsPage.submitForm();

		await assertFeatures();
	});

	test("should save an inline media_text block with its prose and side", async ({
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const title = `${newsPage.workerPrefix} Media Text ${randomUUID()}`;
		const above = `Rich text above ${randomUUID()}`;
		const bio = `Ada chairs the working group ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with a media_text block");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.addContentWithMediaText({
			above,
			assetLabel: "E2E Test Asset",
			text: bio,
			side: "Right",
		});
		await newsPage.submitForm();

		let contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["rich_text", "media_text"]);
		expect(contentBlocks[1]).toMatchObject({ mediaTextSide: "end" });
		expect(JSON.stringify(contentBlocks[1]!.content)).toContain(bio);

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		await newsPage.gotoEditFromDetails();
		await newsPage.expectMediaTextSide("Right");
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["rich_text", "media_text"]);
		expect(contentBlocks[1]).toMatchObject({ mediaTextSide: "end" });
		expect(JSON.stringify(contentBlocks[1]!.content)).toContain(bio);
	});

	test("should save an inline embed block with its title and caption", async ({
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const title = `${newsPage.workerPrefix} Embed ${randomUUID()}`;
		const above = `Rich text above ${randomUUID()}`;
		const embedTitle = `Recording of the session ${randomUUID()}`;
		const embedCaption = `Embed caption ${randomUUID()}`;
		const embedUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with an embed block");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.addContentWithEmbed({
			above,
			url: embedUrl,
			title: embedTitle,
			caption: embedCaption,
		});
		await newsPage.submitForm();

		let contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["rich_text", "embed"]);
		expect(contentBlocks[1]).toMatchObject({ embedTitle, embedUrl });

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		await newsPage.gotoEditFromDetails();
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["rich_text", "embed"]);
		expect(contentBlocks[1]).toMatchObject({ embedTitle, embedUrl });
	});

	/**
	 * The three block types that stay out of the unified document. They had no e2e coverage at all,
	 * because "Content" was the only entry ever chosen from the Add block menu — so nothing verified
	 * that adding, saving or re-loading them works.
	 */
	test("should save the block types that are not inlined into the document", async ({
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const title = `${newsPage.workerPrefix} Standalone Blocks ${randomUUID()}`;
		const heroTitle = `Hero title ${randomUUID()}`;
		const heroEyebrow = `Hero eyebrow ${randomUUID()}`;
		const cta = { label: `Apply now ${randomUUID()}`, url: "https://example.com/apply" };
		const accordionTitle = `Accordion item ${randomUUID()}`;
		const accordionBody = `Accordion body ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with standalone content blocks");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");

		await newsPage.addDataBlock({ dataType: "Events", limit: 3 });
		await newsPage.addHeroBlock({
			title: heroTitle,
			eyebrow: heroEyebrow,
			assetLabel: "E2E Test Asset",
			cta,
		});
		await newsPage.addAccordionBlock({ title: accordionTitle, body: accordionBody });
		await newsPage.submitForm();

		const contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["data", "hero", "accordion"]);
		expect(contentBlocks.map(({ position }) => position)).toStrictEqual([0, 1, 2]);

		expect(contentBlocks[0]).toMatchObject({ dataLimit: 3 });
		expect(contentBlocks[1]).toMatchObject({ heroTitle, heroEyebrow });
		expect(JSON.stringify(contentBlocks[1]!.heroCtas)).toContain(cta.url);
		expect(JSON.stringify(contentBlocks[2]!.accordionItems)).toContain(accordionTitle);
		expect(JSON.stringify(contentBlocks[2]!.accordionItems)).toContain(accordionBody);
	});

	/**
	 * A gallery is a node in the unified document, so it splits out as its own block between the two
	 * runs of prose around it, and its layout, item order and captions survive a re-save that never
	 * touches it. Item order is the part worth driving through the form: positions live in the items
	 * table, and the reorder buttons only mutate panel state until Apply commits the list.
	 */
	test("should save an inline gallery as a gallery block", async ({
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const title = `${newsPage.workerPrefix} Inline Gallery ${randomUUID()}`;
		const above = `Above the gallery ${randomUUID()}`;
		const below = `Below the gallery ${randomUUID()}`;
		const firstCaption = `First gallery caption ${randomUUID()}`;
		const secondCaption = `Second gallery caption ${randomUUID()}`;

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with an inline gallery");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");

		await newsPage.addContentWithGallery({
			above,
			below,
			layout: "Carousel",
			assetLabel: "E2E Test Asset",
			captions: [firstCaption, secondCaption],
			/** Promote the second item, so stored order differs from the order it was picked in. */
			moveEarlier: 2,
		});
		await newsPage.submitForm();

		/** Captions in stored item order — the assertion the `position` column has to earn. */
		const captionsInOrder = (items: unknown) => {
			return (items as Array<{ caption: unknown }>).map((item) => {
				return JSON.stringify(item.caption);
			});
		};

		let contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual([
			"rich_text",
			"gallery",
			"rich_text",
		]);
		expect(contentBlocks[1]).toMatchObject({ galleryLayout: "carousel" });
		expect(captionsInOrder(contentBlocks[1]!.galleryItems)).toStrictEqual([
			expect.stringContaining(secondCaption),
			expect.stringContaining(firstCaption),
		]);

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);
		await newsPage.gotoEditFromDetails();
		await newsPage.submitForm();

		contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual([
			"rich_text",
			"gallery",
			"rich_text",
		]);
		expect(contentBlocks[1]).toMatchObject({ galleryLayout: "carousel" });
		expect(captionsInOrder(contentBlocks[1]!.galleryItems)).toStrictEqual([
			expect.stringContaining(secondCaption),
			expect.stringContaining(firstCaption),
		]);
	});

	test("should save standalone and inline button links in a content block", async ({
		page,
		createWebsiteNewsPage,
		db,
	}) => {
		const newsPage = createWebsiteNewsPage(test.info().workerIndex);
		const title = `${newsPage.workerPrefix} Button Links ${randomUUID()}`;
		const intro = `Rich text intro ${randomUUID()}`;
		const primary = { label: `Apply now ${randomUUID()}`, url: "https://example.com/apply" };
		const secondary = { label: `Learn more ${randomUUID()}`, url: "https://example.com/learn" };
		const inline = {
			before: "Read the ",
			label: `guide ${randomUUID()}`,
			url: "https://example.com/guide",
			after: " carefully.",
		};

		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item with button links");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.addContentWithButtonLinks({ intro, primary, secondary, inline });
		await newsPage.submitForm();

		/** The buttons are inline nodes, so everything stays in a single rich_text block. */
		const contentBlocks = await db.getNewsContentBlocksByTitle(title);
		expect(contentBlocks.map(({ type }) => type)).toStrictEqual(["rich_text"]);

		interface DocNode {
			type?: string;
			content?: Array<DocNode>;
			attrs?: { href?: string; label?: string; variant?: string };
		}
		const paragraphs = (contentBlocks[0]!.content as DocNode).content ?? [];
		const buttonLinks = paragraphs.flatMap((paragraph) =>
			(paragraph.content ?? []).filter((child) => child.type === "buttonLink"),
		);
		expect(buttonLinks).toHaveLength(3);
		expect(buttonLinks.map((node) => node.attrs?.href)).toStrictEqual(
			expect.arrayContaining([primary.url, secondary.url, inline.url]),
		);
		expect(buttonLinks.map((node) => node.attrs?.label)).toStrictEqual(
			expect.arrayContaining([primary.label, secondary.label, inline.label]),
		);
		expect(buttonLinks.map((node) => node.attrs?.variant)).toStrictEqual(
			expect.arrayContaining(["primary", "outline", "secondary"]),
		);

		/** Two buttons each sit alone in a paragraph (block-level CTAs); one is inline with text. */
		const standaloneParagraphs = paragraphs.filter(
			(paragraph) =>
				paragraph.type === "paragraph" &&
				paragraph.content?.length === 1 &&
				paragraph.content[0]?.type === "buttonLink",
		);
		expect(standaloneParagraphs).toHaveLength(2);
		// oxlint-disable-next-line typescript/strict-boolean-expressions
		const inlineParagraph = paragraphs.find(
			(paragraph) =>
				paragraph.type === "paragraph" &&
				(paragraph.content?.length ?? 0) > 1 &&
				paragraph.content?.some((child) => child.type === "buttonLink"),
		);
		expect(inlineParagraph).toBeDefined();

		await newsPage.searchByTitle(title);
		await newsPage.gotoDetailsFromList(title);

		/** Button links render as anchors on the published page. */
		const primaryLink = page.getByRole("link", { name: primary.label });
		await expect(primaryLink).toBeVisible();
		await expect(primaryLink).toHaveAttribute("href", primary.url);
		const secondaryLink = page.getByRole("link", { name: secondary.label });
		await expect(secondaryLink).toBeVisible();
		await expect(secondaryLink).toHaveAttribute("href", secondary.url);
		await expect(page.getByRole("link", { name: inline.label })).toHaveAttribute(
			"href",
			inline.url,
		);
		await expect(page.getByText(intro)).toBeVisible();

		/** The standalone CTA is the only content of its paragraph; the inline one shares text. */
		const primaryParagraphText = await primaryLink.locator("xpath=ancestor::p[1]").innerText();
		expect(primaryParagraphText.trim()).toBe(primary.label);
		const inlineParagraphText = await page
			.getByRole("link", { name: inline.label })
			.locator("xpath=ancestor::p[1]")
			.innerText();
		expect(inlineParagraphText).toContain(inline.before.trim());
		expect(inlineParagraphText).toContain(inline.after.trim());
	});

	test("should delete a news item", async ({ createWebsiteNewsPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const newsPage = createWebsiteNewsPage(workerIndex);

		const title = `${newsPage.workerPrefix} Delete Me ${randomUUID()}`;
		await newsPage.gotoCreate();
		await newsPage.fillTitle(title);
		await newsPage.fillSummary("E2E test news item to be deleted");
		await newsPage.selectImageFromMediaLibrary("E2E Test Asset");
		await newsPage.submitForm();

		await newsPage.searchByTitle(title);
		await expect(newsPage.rowByTitle(title)).toBeVisible();

		const created = await db.getNewsItemByTitle(title);
		expect(created).not.toBeNull();

		const deleteDialog = await newsPage.openDeleteDialog(title);
		await expect(deleteDialog).toBeVisible();
		await newsPage.confirmDelete(deleteDialog);

		// The dialog only closes once the server action succeeded; the row alone would also disappear
		// on the optimistic update, so it is not on its own evidence the delete went through.
		await expect(deleteDialog).toBeHidden();
		await expect(newsPage.rowByTitle(title)).toBeHidden();

		// Source of truth: the entity document and its subtype rows are really gone.
		expect(await db.entityDocumentExists(created!.documentId)).toBe(false);
		expect(await db.getNewsItemByTitle(title)).toBeNull();
	});
});
