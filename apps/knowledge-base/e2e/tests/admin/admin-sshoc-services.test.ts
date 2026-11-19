import { randomUUID } from "node:crypto";

import { expect, test } from "@/e2e/lib/test";

const BASE_PATH = "/en/dashboard/administrator/sshoc-services";
const WORKER_PREFIX = () => `[e2e-worker-${String(test.info().workerIndex)}]`;

test.describe("sshoc services admin", () => {
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerServices(testInfo.workerIndex);
		await db.cleanupWorkerInstitutions(testInfo.workerIndex);
	});

	test("lists, searches and sorts services by owners and providers", async ({ page, db }) => {
		const suffix = randomUUID();
		const [alpha, beta] = await Promise.all([
			db.createPublishedInstitution({
				name: `${WORKER_PREFIX()} Alpha Institution ${suffix}`,
				slug: `e2e-alpha-${suffix}`,
			}),
			db.createPublishedInstitution({
				name: `${WORKER_PREFIX()} Beta Institution ${suffix}`,
				slug: `e2e-beta-${suffix}`,
			}),
		]);
		const firstName = `${WORKER_PREFIX()} SSHOC Service A ${suffix}`;
		const secondName = `${WORKER_PREFIX()} SSHOC Service B ${suffix}`;

		await db.createService({
			name: firstName,
			organisationalUnits: [
				{ documentId: beta.documentId, role: "service_owner" },
				{ documentId: alpha.documentId, role: "service_provider" },
			],
			sshocMarketplaceId: `e2e-a-${suffix}`,
			type: "community",
		});
		await db.createService({
			name: secondName,
			organisationalUnits: [{ documentId: alpha.documentId, role: "service_owner" }],
			sshocMarketplaceId: `e2e-b-${suffix}`,
			type: "community",
		});

		const rows = page.getByRole("row").filter({ hasText: suffix });

		await page.goto(`${BASE_PATH}?q=${encodeURIComponent(suffix)}`);
		await expect(page.getByRole("columnheader", { name: "Service owners" })).toBeVisible();
		await expect(page.getByRole("columnheader", { name: "Service providers" })).toBeVisible();
		await expect(rows).toHaveCount(2);

		const firstRow = rows.filter({ hasText: firstName });
		await expect(firstRow.getByRole("gridcell").nth(2)).toHaveText(
			`${WORKER_PREFIX()} Beta Institution ${suffix}`,
		);
		await expect(firstRow.getByRole("gridcell").nth(3)).toHaveText(
			`${WORKER_PREFIX()} Alpha Institution ${suffix}`,
		);

		// Sorting by owners puts the "Alpha"-owned service first, ahead of the alphabetically earlier
		// service name.
		await page.goto(`${BASE_PATH}?q=${encodeURIComponent(suffix)}&sort=serviceOwners&dir=asc`);
		await expect(rows.nth(0)).toContainText(secondName);
		await expect(rows.nth(1)).toContainText(firstName);

		// Services without a provider sort last in either direction.
		await page.goto(`${BASE_PATH}?q=${encodeURIComponent(suffix)}&sort=serviceProviders&dir=desc`);
		await expect(rows.nth(0)).toContainText(firstName);
		await expect(rows.nth(1)).toContainText(secondName);

		// The search also matches owner and provider names: only the first service has "Beta" as an
		// owner or provider.
		await page.goto(`${BASE_PATH}?q=${encodeURIComponent(`Beta Institution ${suffix}`)}`);
		await expect(rows).toHaveCount(1);
		await expect(rows.nth(0)).toContainText(firstName);
	});

	test("resolves a needs-review service by setting its status", async ({ page, db }) => {
		const suffix = randomUUID();
		const name = `${WORKER_PREFIX()} SSHOC Service ${suffix}`;

		const service = await db.createService({
			name,
			sshocMarketplaceId: `e2e-${suffix}`,
			status: "needs_review",
			type: "community",
		});

		await page.goto(`${BASE_PATH}/${service.id}/edit`);

		// Everything but status stays read-only: the ingest overwrites the rest.
		await expect(page.getByRole("textbox")).toHaveCount(0);

		const control = page
			.locator('[data-slot="control"]')
			.filter({ has: page.getByText("Status", { exact: true }) });
		await control.locator("button").click();
		await page.getByRole("option", { name: "Discontinued", exact: true }).click();

		await page.getByRole("button", { name: "Save" }).click();

		await expect(page.getByText("Service status updated.")).toBeVisible();
		expect(await db.getServiceStatus(service.id)).toBe("discontinued");
	});

	test("does not expose status editing for a service that is not from the marketplace", async ({
		page,
		db,
	}) => {
		const suffix = randomUUID();
		const name = `${WORKER_PREFIX()} Internal Service ${suffix}`;

		const service = await db.createService({ name, status: "live", type: "internal" });

		await page.goto(`${BASE_PATH}/${service.id}/edit`);

		await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
		await expect(page.getByText("Error 404")).toBeVisible();
		await expect(page.getByRole("button", { name: "Save" })).toBeHidden();
		expect(await db.getServiceStatus(service.id)).toBe("live");
	});
});
