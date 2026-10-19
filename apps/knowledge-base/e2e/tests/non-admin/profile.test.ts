import { randomUUID } from "node:crypto";

import type { BrowserContext } from "@playwright/test";

import { waitForActionSuccess } from "@/e2e/lib/fixtures/action-success";
import { clickHydrated } from "@/e2e/lib/fixtures/hydration";
import { expect, test } from "@/e2e/lib/test";

/**
 * A user whose account is linked to a person edits that person at `/dashboard/profile`. Changes are
 * saved as a draft (an admin publishes them), the slug is not offered, and the person's roles are
 * shown but not editable.
 *
 * The global-setup personas are linked to bare person documents without a version, which have no
 * profile to edit, so each test signs in a user of its own, linked to a published person.
 */
test.describe("own profile", () => {
	test.describe.configure({ mode: "default" });

	let context: BrowserContext | null = null;
	let personDocumentId: string | null = null;

	test.afterEach(async ({ db }, testInfo) => {
		await context?.close();
		context = null;
		// The user references the person, so it goes first.
		await db.cleanupWorkerUsers(testInfo.workerIndex);
		if (personDocumentId != null) {
			await db.deletePersonDocument(personDocumentId);
			personDocumentId = null;
		}
	});

	test("edits the linked person as a draft", async ({ browser, db, baseURL }, testInfo) => {
		const prefix = `[e2e-worker-${String(testInfo.workerIndex)}]`;
		const id = randomUUID().slice(0, 8);
		const name = `${prefix} Profile ${id}`;
		const editedName = `${prefix} Edited Profile ${id}`;
		const slug = `e2e-profile-${id}`;

		const person = await db.createPublishedPerson({ name, sortName: name, slug });
		personDocumentId = person.documentId;
		const country = await db.getCountryOption();
		await db.addPersonRelation({
			personDocumentId: person.documentId,
			organisationalUnitDocumentId: country.id,
			roleType: "national_representative",
			start: new Date("2020-01-01T00:00:00.000Z"),
		});
		const { sessionToken } = await db.createSignedInUser({
			name: `${prefix} Profile user ${id}`,
			email: `e2e-profile-${id}@example.com`,
			personDocumentId: person.documentId,
		});

		context = await browser.newContext();
		await context.addCookies([{ name: "session", value: sessionToken, url: baseURL! }]);
		const page = await context.newPage();

		// Reachable from the sidebar and the user menu.
		await page.goto("/en/dashboard");
		await clickHydrated(page.getByRole("button", { name: "Open menu" }));
		await expect(page.getByRole("menuitem", { name: "Your profile" })).toBeVisible();
		await page.keyboard.press("Escape");
		await page.getByRole("link", { name: "Your profile" }).click();
		await expect(page.getByRole("heading", { level: 1, name: "Your profile" })).toBeVisible();

		// Roles are listed read-only.
		await expect(page.getByText(country.name, { exact: true })).toBeVisible();
		await expect(page.getByText("national representative", { exact: true })).toBeVisible();

		// People may not choose their own public URL.
		await expect(page.getByLabel("Slug")).toHaveCount(0);

		await page.getByRole("textbox", { name: "Name", exact: true }).fill(editedName);
		await waitForActionSuccess({
			page,
			trigger: () => clickHydrated(page.getByRole("button", { name: "Save", exact: true })),
		});
		await expect(
			page.getByText("Your changes were saved and will be published after review."),
		).toBeVisible();

		// The edit is a draft: the published version keeps the old name.
		const publishedVersionId = await db.getPublishedVersionId(person.documentId);
		expect((await db.getPersonByName(name))?.id).toBe(publishedVersionId);
		const draft = await db.getPersonByName(editedName);
		expect(draft?.documentId).toBe(person.documentId);
		expect(draft?.id).not.toBe(publishedVersionId);

		await page.reload();
		await expect(page.getByText("Some of your changes are waiting for review.")).toBeVisible();
		await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(editedName);
	});

	test("sends admins to the full person form", async ({ browser, db, baseURL }, testInfo) => {
		// Admins edit their own person where they edit everyone else's, which can also publish.
		const prefix = `[e2e-worker-${String(testInfo.workerIndex)}]`;
		const id = randomUUID().slice(0, 8);
		const name = `${prefix} Admin profile ${id}`;
		const slug = `e2e-admin-profile-${id}`;

		const person = await db.createPublishedPerson({ name, sortName: name, slug });
		personDocumentId = person.documentId;
		const { sessionToken } = await db.createSignedInUser({
			name: `${prefix} Admin profile user ${id}`,
			email: `e2e-admin-profile-${id}@example.com`,
			personDocumentId: person.documentId,
			role: "admin",
		});

		context = await browser.newContext();
		await context.addCookies([{ name: "session", value: sessionToken, url: baseURL! }]);
		const page = await context.newPage();

		await page.goto("/en/dashboard/profile");
		await expect(page).toHaveURL(`/en/dashboard/administrator/persons/${slug}/edit`);
		await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(name);
	});

	test("is not offered without a linked person", async ({ page }) => {
		// The `non-admin` persona's account is not linked to a person.
		await page.goto("/en/dashboard");
		await expect(page.getByRole("link", { name: "Your profile" })).toBeHidden();

		await page.goto("/en/dashboard/profile");
		await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
	});
});
