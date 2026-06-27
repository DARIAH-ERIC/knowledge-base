import { expect, test } from "@/e2e/lib/test";

/**
 * Featured news items on the website metadata page use `AsyncListSelect` (isOrderable, maxItems=3):
 * selected items render as drag-reorderable rows, added via a searchable popover. site_metadata is
 * a singleton, so these tests mutate shared state and must run serially.
 */
test.describe("website metadata – featured news items", () => {
	test.describe.configure({ mode: "serial" });

	let newsItems: Array<{ id: string; name: string }> = [];

	test.beforeAll(async ({ db }) => {
		newsItems = await db.getPublishedNewsItems(4);
	});

	test.afterAll(async ({ db }) => {
		await db.resetSiteMetadataFeaturedItems([]);
	});

	test("should save selected featured items in selection order", async ({
		createAdminSiteMetadataPage,
		db,
	}) => {
		const [first, second] = newsItems;
		await db.resetSiteMetadataFeaturedItems([]);

		const metadataPage = createAdminSiteMetadataPage();
		await metadataPage.goto();

		// Add in reverse title order to prove the saved order follows selection, not the sort.
		await metadataPage.addFeatured(second!.name);
		await metadataPage.addFeatured(first!.name);

		expect(await metadataPage.getFeaturedNames()).toStrictEqual([second!.name, first!.name]);

		await metadataPage.save();

		expect(await db.getSiteMetadataFeaturedItemIds()).toStrictEqual([second!.id, first!.id]);
	});

	test("should disable further options once the maximum of three is reached", async ({
		createAdminSiteMetadataPage,
		db,
	}) => {
		const [first, second, third, fourth] = newsItems;
		await db.resetSiteMetadataFeaturedItems([first!.id, second!.id, third!.id]);

		const metadataPage = createAdminSiteMetadataPage();
		await metadataPage.goto();

		expect(await metadataPage.getFeaturedNames()).toHaveLength(3);
		expect(await metadataPage.isOptionDisabled(fourth!.name)).toBe(true);
	});

	test("should remove a featured item", async ({ createAdminSiteMetadataPage, db }) => {
		const [first, second] = newsItems;
		await db.resetSiteMetadataFeaturedItems([first!.id, second!.id]);

		const metadataPage = createAdminSiteMetadataPage();
		await metadataPage.goto();

		await metadataPage.removeFeatured(first!.name);

		expect(await metadataPage.getFeaturedNames()).toStrictEqual([second!.name]);

		await metadataPage.save();

		expect(await db.getSiteMetadataFeaturedItemIds()).toStrictEqual([second!.id]);
	});

	test("should persist a reordered selection", async ({ createAdminSiteMetadataPage, db }) => {
		const [first, second, third] = newsItems;
		await db.resetSiteMetadataFeaturedItems([first!.id, second!.id, third!.id]);

		const metadataPage = createAdminSiteMetadataPage();
		await metadataPage.goto();

		// Move the first item down one position: [first, second, third] -> [second, first, third].
		await metadataPage.moveFeaturedDown(first!.name);

		expect(await metadataPage.getFeaturedNames()).toStrictEqual([
			second!.name,
			first!.name,
			third!.name,
		]);

		await metadataPage.save();

		expect(await db.getSiteMetadataFeaturedItemIds()).toStrictEqual([
			second!.id,
			first!.id,
			third!.id,
		]);
	});
});
