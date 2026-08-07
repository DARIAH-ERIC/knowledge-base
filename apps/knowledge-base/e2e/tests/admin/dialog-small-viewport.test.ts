import type { Locator } from "@playwright/test";

import { E2E_TEST_ASSET_LABEL } from "@/e2e/lib/fixtures/database-service";
import { expect, test } from "@/e2e/lib/test";

/**
 * A laptop viewport short enough that the asset dialogs want more height than they can have. Taken
 * from a user report of the media library dialog being cut off.
 */
const shortViewport = { width: 1369, height: 719 };

test.use({ viewport: shortViewport });

/**
 * A dialog caps its height at the visual viewport and clips whatever exceeds it, and there is no
 * page behind it to scroll — so anything outside the dialog box is unreachable. Only the body may
 * scroll; the footer's actions must stay in place and stay on screen.
 */
async function expectDialogFitsViewport(dialog: Locator) {
	/**
	 * Nothing sticks out of the dialog. This is what regressed: with header, body and footer wrapped
	 * in a form, the form sized itself to its content, overflowed the capped dialog, and pushed the
	 * footer past the bottom of the screen. Rounding of the two measured integers can differ by a
	 * pixel; the failure this guards against is off by hundreds.
	 */
	const clipped = await dialog.evaluate((element) => element.scrollHeight - element.clientHeight);
	expect(clipped).toBeLessThanOrEqual(1);

	const box = await dialog.boundingBox();
	if (box == null) {
		throw new Error("Could not resolve the bounding box of the dialog.");
	}

	expect(box.y).toBeGreaterThanOrEqual(0);
	expect(box.y + box.height).toBeLessThanOrEqual(shortViewport.height);
}

test.describe("dialogs on a short viewport", () => {
	test("keeps the media library actions reachable", async ({ createAssetsPage }) => {
		const assetsPage = createAssetsPage();

		const dialog = await assetsPage.openMediaLibraryDialog();

		await expectDialogFitsViewport(dialog);

		await expect(dialog.getByRole("button", { name: "Cancel" })).toBeInViewport({ ratio: 1 });
		await expect(dialog.getByRole("button", { name: "Select", exact: true })).toBeInViewport({
			ratio: 1,
		});
	});

	test("scrolls the edit asset metadata dialog instead of cutting it off", async ({
		createAssetsPage,
	}) => {
		const assetsPage = createAssetsPage();

		const dialog = await assetsPage.openEditAssetMetadataDialog(E2E_TEST_ASSET_LABEL);

		await expectDialogFitsViewport(dialog);

		/**
		 * The preview, four fields and the caption editor add up to more than fits at this height, so
		 * the body has to be the region that scrolls. Asserting it does keeps the check above honest: a
		 * dialog that fits without overflowing anywhere would satisfy it for the wrong reason.
		 */
		const body = dialog.locator("[data-slot=dialog-body]");
		const isBodyScrollable = await body.evaluate(
			(element) => element.scrollHeight > element.clientHeight,
		);
		expect(isBodyScrollable).toBe(true);

		await expect(dialog.getByRole("button", { name: "Cancel" })).toBeInViewport({ ratio: 1 });
		await expect(dialog.getByRole("button", { name: "Save" })).toBeInViewport({ ratio: 1 });
	});
});
