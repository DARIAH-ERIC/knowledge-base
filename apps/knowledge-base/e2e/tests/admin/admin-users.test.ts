import { randomUUID } from "node:crypto";

import { openActionsMenu } from "@/e2e/lib/fixtures/actions-menu";
import { expect, test } from "@/e2e/lib/test";

test.describe("users admin", () => {
	/**
	 * Run sequentially within this file. Suites may run concurrently because test data is isolated by
	 * Playwright worker index.
	 */
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }, testInfo) => {
		await db.cleanupWorkerUsers(testInfo.workerIndex);
	});

	test("should create a user", async ({ createAdminUsersPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);

		const name = `${usersPage.workerPrefix} Test User ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+${randomUUID()}@example.com`;

		await usersPage.gotoCreate();

		await usersPage.fillName(name);
		await usersPage.fillEmail(email);

		await usersPage.submitForm();

		await usersPage.searchByName(name);
		await expect(usersPage.rowByName(name)).toBeVisible();

		const created = await db.getUserByName(name);
		expect(created).not.toBeNull();
		expect(created).toMatchObject({
			canManageAdmins: false,
			email,
			name,
			organisationalUnitId: null,
			personId: null,
			role: "user",
		});

		// The user is invited rather than given a password by the admin.
		await expect(usersPage.rowByName(name).getByText("Invitation pending")).toBeVisible();
		expect(await db.getUserCredentialStateByName(name)).toStrictEqual({
			hasPassword: false,
			isEmailVerified: false,
			invitations: 1,
		});
	});

	test("should refuse to invite an email address that already has an account", async ({
		page,
		createAdminUsersPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);

		const existingName = `${usersPage.workerPrefix} Signed Up ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+${randomUUID()}@example.com`;
		await db.createUserWithPassword({ name: existingName, email });

		const name = `${usersPage.workerPrefix} Duplicate ${randomUUID()}`;

		await usersPage.gotoCreate();
		await usersPage.fillName(name);
		// Email addresses are compared case-insensitively.
		await usersPage.fillEmail(email.toUpperCase());
		await page.getByRole("button", { name: "Save" }).click();

		await expect(
			page.getByText("A user with this email address already exists. Edit that user instead."),
		).toBeVisible();
		expect(page.url()).toContain("/dashboard/administrator/users/create");

		expect(await db.countUsersByEmail(email)).toBe(1);
		expect(await db.getUserByName(name)).toBeNull();
		// The existing account is untouched: it keeps its password and gets no invitation.
		expect(await db.getUserCredentialStateByName(existingName)).toStrictEqual({
			hasPassword: true,
			isEmailVerified: true,
			invitations: 0,
		});
	});

	test("should resend an invitation", async ({ page, createAdminUsersPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);

		const name = `${usersPage.workerPrefix} Resend ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+${randomUUID()}@example.com`;

		await usersPage.gotoCreate();
		await usersPage.fillName(name);
		await usersPage.fillEmail(email);
		await usersPage.submitForm();

		await usersPage.searchByName(name);
		await usersPage.resendInvitation(name);

		await expect(page.getByText(`Invitation sent to ${email}.`)).toBeVisible();
		// The new invitation replaces the old one, so only the latest link works.
		expect(await db.getUserCredentialStateByName(name)).toMatchObject({ invitations: 1 });
	});

	test("invited user cannot sign in before choosing a password", async ({
		browser,
		createAdminUsersPage,
	}) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);

		const name = `${usersPage.workerPrefix} Not Activated ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+${randomUUID()}@example.com`;

		await usersPage.gotoCreate();
		await usersPage.fillName(name);
		await usersPage.fillEmail(email);
		await usersPage.submitForm();

		const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
		try {
			const page = await context.newPage();

			await page.goto("/en/auth/sign-in");
			await page.getByLabel("Email").fill(email);
			await page.getByLabel("Password").fill("any password at all");
			await page.getByRole("button", { name: "Sign in" }).click();

			await expect(page.getByText("This account has not been activated yet.")).toBeVisible();
			expect(page.url()).toContain("/auth/sign-in");
			expect(
				(await context.cookies()).some((cookie) => cookie.name === "session"),
				"no session is created",
			).toBe(false);
		} finally {
			await context.close();
		}
	});

	test("invited user can choose a password and continue to two-factor setup", async ({
		browser,
		createAdminUsersPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);

		const name = `${usersPage.workerPrefix} Invitee ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+${randomUUID()}@example.com`;

		await usersPage.gotoCreate();
		await usersPage.fillName(name);
		await usersPage.fillEmail(email);
		await usersPage.submitForm();

		const user = await db.getUserByName(name);
		expect(user).not.toBeNull();
		const token = await db.createUserInvitationToken(user!.id);
		const href = `/en/auth/accept-invitation?token=${token}`;

		// Accepting signs the invitee in, replacing whoever was signed in before; a fresh context keeps
		// the shared admin session out of it.
		const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
		try {
			const page = await context.newPage();

			await page.goto(href);
			await expect(page.getByRole("heading", { name: `Welcome, ${name}` })).toBeVisible();

			const password = `e2e-${randomUUID()}`;
			await page.getByLabel("Password", { exact: true }).fill(password);
			await page.getByLabel("Confirm password").fill(password);
			await page.getByRole("button", { name: "Set password" }).click();

			await page.waitForURL("**/auth/two-factor/setup");

			expect(await db.getUserCredentialStateByName(name)).toStrictEqual({
				hasPassword: true,
				isEmailVerified: true,
				invitations: 0,
			});

			// The link is single use.
			await page.goto(href);
			await expect(page.getByRole("heading", { name: "Invitation not valid" })).toBeVisible();
		} finally {
			await context.close();
		}
	});

	test("should edit all user form fields", async ({ page, createAdminUsersPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);

		const originalName = `${usersPage.workerPrefix} Edit Me ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+${randomUUID()}@example.com`;

		await usersPage.gotoCreate();
		await usersPage.fillName(originalName);
		await usersPage.fillEmail(email);
		await usersPage.submitForm();

		await usersPage.searchByName(originalName);
		const row = usersPage.rowByName(originalName);
		await expect(row).toBeVisible();

		await openActionsMenu(row);
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		const updatedName = `${usersPage.workerPrefix} Updated ${randomUUID()}`;
		const updatedEmail = `e2e-worker-${String(workerIndex)}+updated-${randomUUID()}@example.com`;

		await page.getByLabel("Name", { exact: true }).fill(updatedName);
		await usersPage.fillEmail(updatedEmail);
		await usersPage.submitForm();

		await usersPage.searchByName(updatedName);
		await expect(usersPage.rowByName(updatedName)).toBeVisible();
		await usersPage.searchByName(originalName);
		await expect(usersPage.rowByName(originalName)).toBeHidden();

		const updated = await db.getUserByName(updatedName);
		expect(updated).not.toBeNull();
		expect(updated).toMatchObject({
			canManageAdmins: false,
			email: updatedEmail,
			name: updatedName,
			organisationalUnitId: null,
			personId: null,
			role: "user",
		});
	});

	test("should clear optional user actor and admin fields", async ({
		page,
		createAdminUsersPage,
		db,
	}) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);
		const person = await db.getPersonOption();
		const originalName = `${usersPage.workerPrefix} Clear Optional ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+clear-${randomUUID()}@example.com`;

		await usersPage.gotoCreate();
		await usersPage.fillName(originalName);
		await usersPage.fillEmail(email);
		await usersPage.selectRole("Admin");
		await usersPage.setCanManageAdmins();
		await usersPage.selectPersonActor(person.name);
		await usersPage.submitForm();

		await usersPage.searchByName(originalName);
		const row = usersPage.rowByName(originalName);
		await openActionsMenu(row);
		await Promise.all([
			page.waitForURL("**/edit"),
			page.getByRole("menuitem", { name: "Edit" }).click(),
		]);

		const updatedName = `${usersPage.workerPrefix} Cleared ${randomUUID()}`;
		await page.getByLabel("Name", { exact: true }).fill(updatedName);
		await usersPage.selectRole("User");
		await usersPage.selectActorType("None");
		await usersPage.submitForm();

		const updated = await db.getUserByName(updatedName);
		expect(updated).toMatchObject({
			canManageAdmins: false,
			organisationalUnitId: null,
			personId: null,
			role: "user",
		});
	});

	test("should delete a user", async ({ createAdminUsersPage, db }) => {
		const workerIndex = test.info().workerIndex;
		const usersPage = createAdminUsersPage(workerIndex);

		const name = `${usersPage.workerPrefix} Delete Me ${randomUUID()}`;
		const email = `e2e-worker-${String(workerIndex)}+${randomUUID()}@example.com`;

		await usersPage.gotoCreate();
		await usersPage.fillName(name);
		await usersPage.fillEmail(email);
		await usersPage.submitForm();

		await usersPage.searchByName(name);
		await expect(usersPage.rowByName(name)).toBeVisible();

		expect(await db.getUserByName(name)).not.toBeNull();

		const deleteDialog = await usersPage.openDeleteDialog(name);
		await expect(deleteDialog).toBeVisible();
		await usersPage.confirmDelete(deleteDialog);

		// The dialog only closes once the server action succeeded; the row alone would also disappear
		// on the optimistic update, so it is not on its own evidence the delete went through.
		await expect(deleteDialog).toBeHidden();
		await expect(usersPage.rowByName(name)).toBeHidden();

		// Source of truth: users are not entity documents, so the row itself must be gone.
		expect(await db.getUserByName(name)).toBeNull();
	});
});
