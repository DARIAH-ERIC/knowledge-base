import { randomUUID } from "node:crypto";

import { dropFile } from "@/e2e/lib/fixtures/drop-file";
import { expect, test } from "@/e2e/lib/test";

const svgImage = {
	name: "dropped.svg",
	mimeType: "image/svg+xml",
	buffer: Buffer.from(
		'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="teal"/></svg>',
	),
};

test.describe("asset uploads", () => {
	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerAssets(testInfo.workerIndex);
	});

	test("offers document file types for the documents prefix", async ({ createAssetsPage }) => {
		const assetsPage = createAssetsPage();
		const dialog = await assetsPage.openUploadAssetDialog();
		const fileInput = dialog.locator('input[type="file"]');

		await expect(fileInput).not.toHaveAttribute("accept", /application\/pdf/);

		await assetsPage.selectUploadPrefix(dialog, "documents");

		await expect(fileInput).toHaveAttribute("accept", /application\/pdf/);
	});

	/** The dialog submits its native file input, so a dropped file must make it into that input. */
	test("uploads a file dropped onto the upload dialog", async ({ createAssetsPage, db }) => {
		const assetsPage = createAssetsPage();
		const label = `[e2e-worker-${String(test.info().workerIndex)}] Dropped ${randomUUID()}`;

		const dialog = await assetsPage.openUploadAssetDialog();
		await expect(dialog.getByText("or drag and drop a file here")).toBeVisible();

		await dropFile(dialog, svgImage);

		await expect(dialog.getByText("or drag and drop a file here")).toBeHidden();
		await expect
			.poll(() =>
				dialog
					.locator('input[type="file"]')
					.evaluate((input: HTMLInputElement) => input.files?.[0]?.name),
			)
			.toBe(svgImage.name);

		await dialog.getByLabel("Label").fill(label);
		await dialog.getByRole("button", { name: "Upload", exact: true }).click();
		await dialog.waitFor({ state: "hidden" });

		const asset = await db.getAssetByLabel(label);
		expect(asset).not.toBeNull();
	});

	test("ignores a dropped file of a type the prefix does not accept", async ({
		createAssetsPage,
	}) => {
		const assetsPage = createAssetsPage();
		const dialog = await assetsPage.openUploadAssetDialog();

		/** The default `images` prefix does not take documents. */
		await dropFile(dialog, {
			name: "document.pdf",
			mimeType: "application/pdf",
			buffer: Buffer.from("%PDF-1.4\n%%EOF"),
		});

		await expect(dialog.getByText("or drag and drop a file here")).toBeVisible();
		expect(
			await dialog
				.locator('input[type="file"]')
				.evaluate((input: HTMLInputElement) => input.files?.length ?? 0),
		).toBe(0);
	});
});
