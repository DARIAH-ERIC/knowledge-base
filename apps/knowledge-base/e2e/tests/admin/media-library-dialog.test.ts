import { E2E_TEST_ASSET_LABEL } from "@/e2e/lib/fixtures/database-service";
import { dropFile } from "@/e2e/lib/fixtures/drop-file";
import { clickHydrated } from "@/e2e/lib/fixtures/hydration";
import { expect, test } from "@/e2e/lib/test";

const svgImage = {
	name: "dropped.svg",
	mimeType: "image/svg+xml",
	buffer: Buffer.from(
		'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="teal"/></svg>',
	),
};

/** A host whose image picker offers several prefixes, defaulting to `images`. */
const MULTI_PREFIX_HOST_PATH = "/en/dashboard/website/events/create";

function isAssetsRequest(url: string, prefix: string): boolean {
	const parsed = new URL(url);
	return parsed.pathname === "/api/assets" && parsed.searchParams.get("prefix") === prefix;
}

/**
 * The dialog resets on the transition into open rather than in the trigger's click handler, because
 * a controlled caller opens it by flipping `isOpen`. That reset happens during render and the first
 * page is fetched from an effect, so these tests pin down what an author sees on every open, not
 * just the first one.
 */
test.describe("media library dialog", () => {
	test("starts fresh on reopen: select tab, default prefix, empty search, first page refetched", async ({
		createAssetsPage,
		page,
	}) => {
		const assetsPage = createAssetsPage();

		let dialog = await assetsPage.openMediaLibraryDialog(MULTI_PREFIX_HOST_PATH);
		await assetsPage.searchInMediaLibrary(dialog, E2E_TEST_ASSET_LABEL);
		await dialog.getByRole("button", { name: "logos", exact: true }).click();
		await clickHydrated(dialog.getByRole("tab", { name: "Upload" }));
		await expect(dialog.getByRole("tab", { name: "Upload" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		await assetsPage.closeMediaLibraryDialog(dialog);

		const refetch = page.waitForRequest((request) => isAssetsRequest(request.url(), "images"));
		dialog = await assetsPage.reopenMediaLibraryDialog();
		const request = await refetch;

		/** The first page is fetched unfiltered, for the default prefix. */
		expect(new URL(request.url()).searchParams.has("q")).toBe(false);

		await expect(dialog.getByRole("tab", { name: "Select" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		await expect(dialog.getByRole("searchbox")).toHaveValue("");
		await expect(
			assetsPage.mediaLibraryAssetByLabel(dialog, E2E_TEST_ASSET_LABEL).first(),
		).toBeVisible();
	});

	test("does not carry a selection over into the next open", async ({ createAssetsPage }) => {
		const assetsPage = createAssetsPage();

		let dialog = await assetsPage.openMediaLibraryDialog(MULTI_PREFIX_HOST_PATH);
		await assetsPage.searchInMediaLibrary(dialog, E2E_TEST_ASSET_LABEL);
		await assetsPage.mediaLibraryAssetByLabel(dialog, E2E_TEST_ASSET_LABEL).first().click();
		await expect(dialog.getByRole("button", { name: "Select", exact: true })).toBeEnabled();
		await assetsPage.closeMediaLibraryDialog(dialog);

		dialog = await assetsPage.reopenMediaLibraryDialog();
		await expect(
			assetsPage.mediaLibraryAssetByLabel(dialog, E2E_TEST_ASSET_LABEL).first(),
		).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Select", exact: true })).toBeDisabled();
	});

	test("switching prefix clears the search and fetches the new prefix", async ({
		createAssetsPage,
		page,
	}) => {
		const assetsPage = createAssetsPage();

		const dialog = await assetsPage.openMediaLibraryDialog(MULTI_PREFIX_HOST_PATH);
		await assetsPage.searchInMediaLibrary(dialog, E2E_TEST_ASSET_LABEL);

		const prefixFetch = page.waitForResponse((response) =>
			isAssetsRequest(response.url(), "logos"),
		);
		await dialog.getByRole("button", { name: "logos", exact: true }).click();
		const response = await prefixFetch;

		expect(new URL(response.url()).searchParams.has("q")).toBe(false);
		await expect(dialog.getByRole("searchbox")).toHaveValue("");

		/**
		 * The fixtures hold an "E2E Test Asset" under every image prefix, so the grid looks the same
		 * either way; what changed is which prefix the shown page came from.
		 */
		const { items } = (await response.json()) as { items: Array<{ key: string }> };
		expect(items.length).toBeGreaterThan(0);
		expect(items.every((item) => item.key.startsWith("logos/"))).toBe(true);
		await expect(assetsPage.mediaLibraryAssetByLabel(dialog, E2E_TEST_ASSET_LABEL)).toHaveCount(1);
	});

	test("keeps entered upload metadata when the upload fails", async ({ createAssetsPage }) => {
		const assetsPage = createAssetsPage();

		let dialog = await assetsPage.openMediaLibraryDialog(MULTI_PREFIX_HOST_PATH);
		await clickHydrated(dialog.getByRole("tab", { name: "Upload" }));

		/** `accept` only filters the file picker, so the server rejects the file type. */
		await dialog.locator('input[type="file"]').setInputFiles({
			name: "not-an-image.txt",
			mimeType: "text/plain",
			buffer: Buffer.from("not an image"),
		});
		await dialog.getByLabel("Label").fill("Label which must survive a failed upload");
		await dialog.getByLabel("Alt text").fill("Alt text which must survive a failed upload");
		await dialog.getByRole("button", { name: "Upload", exact: true }).click();

		await expect(dialog.getByText("Invalid or missing fields.")).toBeVisible();
		/** React's automatic form reset must not discard the user's input. */
		await expect(dialog.getByLabel("Label")).toHaveValue(
			"Label which must survive a failed upload",
		);
		await expect(dialog.getByLabel("Alt text")).toHaveValue(
			"Alt text which must survive a failed upload",
		);

		await assetsPage.closeMediaLibraryDialog(dialog);
		dialog = await assetsPage.reopenMediaLibraryDialog();
		await clickHydrated(dialog.getByRole("tab", { name: "Upload" }));

		await expect(dialog.getByLabel("Label")).toHaveValue("");
		await expect(dialog.getByLabel("Alt text")).toHaveValue("");
		await expect(dialog.getByText("Invalid or missing fields.")).toBeHidden();
	});

	test("accepts an image dropped onto the upload tab", async ({ createAssetsPage }) => {
		const assetsPage = createAssetsPage();

		const dialog = await assetsPage.openMediaLibraryDialog(MULTI_PREFIX_HOST_PATH);
		await clickHydrated(dialog.getByRole("tab", { name: "Upload" }));
		await expect(dialog.getByText("or drag and drop a file here")).toBeVisible();

		await dropFile(dialog, svgImage);

		await expect(dialog.getByText(svgImage.name)).toBeVisible();
		await expect(dialog.getByText("or drag and drop a file here")).toBeHidden();
		await expect(dialog.getByRole("button", { name: "Upload", exact: true })).toBeEnabled();
	});

	test("ignores a dropped file of a type it does not accept", async ({ createAssetsPage }) => {
		const assetsPage = createAssetsPage();

		const dialog = await assetsPage.openMediaLibraryDialog(MULTI_PREFIX_HOST_PATH);
		await clickHydrated(dialog.getByRole("tab", { name: "Upload" }));

		await dropFile(dialog, {
			name: "not-an-image.txt",
			mimeType: "text/plain",
			buffer: Buffer.from("not an image"),
		});

		await expect(dialog.getByText("not-an-image.txt")).toBeHidden();
		await expect(dialog.getByText("or drag and drop a file here")).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Upload", exact: true })).toBeDisabled();
	});
});
