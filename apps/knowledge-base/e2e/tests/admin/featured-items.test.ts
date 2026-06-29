import { expect, test } from "@/e2e/lib/test";

/**
 * Featured news items on the website featured-items page use `AsyncListSelect` (isOrderable,
 * maxItems=3): selected items render as drag-reorderable rows, added via a searchable popover.
 * site_metadata is a singleton, so these tests mutate shared state and must run serially.
 */
test.describe("website featured news items", () => {
	test.describe.configure({ mode: "serial" });

	let newsItems: Array<{ id: string; name: string }> = [];

	test.beforeAll(async ({ db }) => {
		newsItems = await db.getPublishedNewsItems(4);
	});

	test.afterAll(async ({ db }) => {
		await db.resetSiteMetadataFeaturedItems([]);
	});

	test("should save selected featured items in selection order", async ({
		createAdminFeaturedItemsPage,
		db,
	}) => {
		const [first, second] = newsItems;
		await db.resetSiteMetadataFeaturedItems([]);

		const featuredPage = createAdminFeaturedItemsPage();
		await featuredPage.goto();

		// Add in reverse title order to prove the saved order follows selection, not the sort.
		await featuredPage.addFeatured(second!.name);
		await featuredPage.addFeatured(first!.name);

		expect(await featuredPage.getFeaturedNames()).toStrictEqual([second!.name, first!.name]);

		await featuredPage.save();

		expect(await db.getSiteMetadataFeaturedItemIds()).toStrictEqual([second!.id, first!.id]);
	});

	test("should disable further options once the maximum of three is reached", async ({
		createAdminFeaturedItemsPage,
		db,
	}) => {
		const [first, second, third, fourth] = newsItems;
		await db.resetSiteMetadataFeaturedItems([first!.id, second!.id, third!.id]);

		const featuredPage = createAdminFeaturedItemsPage();
		await featuredPage.goto();

		expect(await featuredPage.getFeaturedNames()).toHaveLength(3);
		expect(await featuredPage.isOptionDisabled(fourth!.name)).toBe(true);
	});

	test("should remove a featured item", async ({ createAdminFeaturedItemsPage, db }) => {
		const [first, second] = newsItems;
		await db.resetSiteMetadataFeaturedItems([first!.id, second!.id]);

		const featuredPage = createAdminFeaturedItemsPage();
		await featuredPage.goto();

		await featuredPage.removeFeatured(first!.name);

		expect(await featuredPage.getFeaturedNames()).toStrictEqual([second!.name]);

		await featuredPage.save();

		expect(await db.getSiteMetadataFeaturedItemIds()).toStrictEqual([second!.id]);
	});

	test("should persist a reordered selection", async ({ createAdminFeaturedItemsPage, db }) => {
		const [first, second, third] = newsItems;
		await db.resetSiteMetadataFeaturedItems([first!.id, second!.id, third!.id]);

		const featuredPage = createAdminFeaturedItemsPage();
		await featuredPage.goto();

		// Move the first item down one position: [first, second, third] -> [second, first, third].
		await featuredPage.moveFeaturedDown(first!.name);

		expect(await featuredPage.getFeaturedNames()).toStrictEqual([
			second!.name,
			first!.name,
			third!.name,
		]);

		await featuredPage.save();

		expect(await db.getSiteMetadataFeaturedItemIds()).toStrictEqual([
			second!.id,
			first!.id,
			third!.id,
		]);
	});
});
