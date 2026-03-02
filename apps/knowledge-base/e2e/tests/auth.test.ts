import { env } from "@/config/env.config";
import { expect, test } from "@/e2e/lib/test";

test.describe("auth", () => {
	// eslint-disable-next-line playwright/no-skipped-test
	test.skip(() => {
		return env.AUTH_SIGN_UP !== "enabled"
	})

	test("should allow user to create new account", async ({ page, createEmailService }) => {
		const emailService = createEmailService()

		const name = "DARIAH Test"
		const email = "dariah-test@example.com"
		const password = "28d4d45734a63e69c835b58f579627f2"

		await page.goto('/en/auth/sign-up');

		await page.getByRole('textbox', { name: 'Name' }).fill(name);
		await page.getByRole('textbox', { name: 'Email' }).fill(email);
		await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
		await page.getByRole('textbox', { name: 'Confirm password' }).fill('abc');
		await page.getByRole('button', { name: 'Continue' }).click();

		await expect(page.getByRole("main").getByRole("alert")).toHaveText("Invalid or missing fields.")
		await expect(page.getByRole("textbox", { name: "Confirm password" })).toHaveAccessibleDescription("Passwords don't match.")

		await page.getByRole('textbox', { name: 'Name' }).fill(name);
		await page.getByRole('textbox', { name: 'Email' }).fill(email);
		await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
		await page.getByRole('textbox', { name: 'Confirm password' }).fill(password);
		await page.getByRole('button', { name: 'Continue' }).click();

		await page.waitForURL("/en/auth/verify-email")

		const messages = await emailService.getMessages()
		const text = messages.messages.at(0)?.Text
		const code = text?.replace(/.*: (.*)/, "$1") ?? ""
		await page.getByRole('textbox', { name: 'Verification code' }).fill(code);

	})

})
