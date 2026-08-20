import { expect, test } from "@/e2e/lib/test";

/**
 * DARIAH ERIC is a singleton seeded by migration — there is one row, no create or delete flow, and
 * no worker prefix to isolate it behind. Every test here mutates the same record, so the file runs
 * in one worker, in order, and `afterAll` puts the email back the way it found it.
 */
test.describe("eric admin", () => {
	test.describe.configure({ mode: "default" });

	test.afterAll(async ({ db }) => {
		await db.resetEricEmail();
	});

	test("should save an email address", async ({ createAdminEricPage, db, page }) => {
		const ericPage = createAdminEricPage();
		const email = "eric@e2e.example.org";

		await ericPage.gotoEditFromList();
		await ericPage.fillEmail(email);
		await ericPage.submitForm();

		// The submit redirects to the details page, where the email renders as a mailto link.
		await expect(page.getByRole("link", { name: email })).toHaveAttribute(
			"href",
			`mailto:${email}`,
		);

		expect(await db.getEricDraft()).toMatchObject({ email });
	});

	test("should clear the email address", async ({ createAdminEricPage, db }) => {
		const ericPage = createAdminEricPage();

		await ericPage.gotoEditFromList();
		await ericPage.fillEmail("eric-to-clear@e2e.example.org");
		await ericPage.submitForm();

		await ericPage.gotoEditFromList();
		await ericPage.fillEmail("");
		await ericPage.submitForm();

		expect(await db.getEricDraft()).toMatchObject({ email: null });
	});

	test("should reject an invalid email address", async ({ createAdminEricPage, db, page }) => {
		const ericPage = createAdminEricPage();

		await ericPage.gotoEditFromList();
		await ericPage.fillEmail("");
		await ericPage.submitForm();

		await ericPage.gotoEditFromList();
		await ericPage.fillEmail("not-an-email");
		await ericPage.saveButton().click();

		// Unlike the plain-text mailing-list fields this is `type="email"`, so the browser rejects the
		// value and blocks the submit before the server action ever sees it. The wording of the native
		// message differs per browser, so assert the mechanism and the outcome instead of the text.
		const isValid = await ericPage
			.emailField()
			.evaluate((element) => (element as HTMLInputElement).checkValidity());
		expect(isValid).toBe(false);

		// The save redirects to the details page when it goes through, so its absence is the proof
		// that nothing was submitted.
		let didRedirect = true;
		await page.waitForURL(/\/details$/, { timeout: 2000 }).catch(() => (didRedirect = false));
		expect(didRedirect).toBe(false);

		expect(await db.getEricDraft()).toMatchObject({ email: null });
	});
});
