import { assert, createUrl } from "@acdh-oeaw/lib";

import { env } from "@/config/env.config";
import { expect, test } from "@/e2e/lib/test";
import { defaultLocale, locales } from "@/lib/i18n/locales";

test.describe("contact page", () => {
	test("should have document title", async ({ createContactPage }) => {
		for (const locale of locales) {
			const { i18n, contactPage } = await createContactPage(locale);
			await contactPage.goto();

			await expect(contactPage.page).toHaveTitle(
				[i18n.t("ContactPage.meta.title"), i18n.messages.metadata.title].join(" | "),
			);
		}
	});

	test("should not have any automatically detectable accessibility issues", async ({
		createAccessibilityScanner,
		createContactPage,
	}) => {
		for (const locale of locales) {
			const { contactPage } = await createContactPage(locale);
			await contactPage.goto();

			const { getViolations } = await createAccessibilityScanner();
			expect(await getViolations()).toEqual([]);
		}
	});

	// eslint-disable-next-line playwright/no-skipped-test
	test.describe.skip("should not have visible changes", () => {
		test.use({ colorScheme: "light" });

		test("in light mode", async ({ createContactPage }) => {
			for (const locale of locales) {
				const { contactPage } = await createContactPage(locale);
				await contactPage.goto();

				await expect(contactPage.page).toHaveScreenshot({ fullPage: true });
			}
		});
	});

	// eslint-disable-next-line playwright/no-skipped-test
	test.describe.skip("should not have visible changes", () => {
		test.use({ colorScheme: "dark" });

		test("in dark mode", async ({ createContactPage }) => {
			for (const locale of locales) {
				const { contactPage } = await createContactPage(locale);
				await contactPage.goto();

				await expect(contactPage.page).toHaveScreenshot({ fullPage: true });
			}
		});
	});

	test.describe("contact form", () => {
		// eslint-disable-next-line playwright/no-skipped-test
		test.skip(() => {
			return env.MAILPIT_API_BASE_URL == null;
		}, "Email service disabled.");

		/** Run sequentially. */
		test.describe.configure({ mode: "default" });

		const pollIntervalMs = 500;
		const pollTimeoutMs = 10_000;

		test.beforeEach(async ({ createEmailService }) => {
			const emailService = createEmailService();
			await emailService.clear();
		});

		test("should send contact form submission via email", async ({
			createContactPage,
			createEmailService,
		}) => {
			// TODO: run for all locales?
			const locale = defaultLocale;

			const emailService = createEmailService();

			const { contactPage, i18n } = await createContactPage(locale);
			await contactPage.goto();

			const name = "Firstname Lastname";
			const email = "user@example.com";
			const subject = "Testing form submission";
			const message = `The current time is ${new Date().toISOString()}.`;

			await contactPage.form.name.fill(name);
			await contactPage.form.email.fill(email);
			await contactPage.form.subject.fill(subject);
			await contactPage.form.message.fill(message);
			await contactPage.form.submit.click();

			await expect(contactPage.page.getByRole("status")).toContainText(
				i18n.t("actions.sendContactFormEmailAction.success"),
				{ timeout: 1000 },
			);

			await expect
				.poll(
					async () => {
						const data = await emailService.getMessages();
						return data.total;
					},
					{
						message: "Wait for at least one email to appear in Mailpit.",
						intervals: [pollIntervalMs],
						timeout: pollTimeoutMs,
					},
				)
				.toBeGreaterThanOrEqual(1);

			const data = await emailService.getMessages();

			const [msg] = data.messages;
			expect(msg).toBeDefined();
			assert(msg);

			expect(msg.To[0]?.Address).toBe(env.EMAIL_ADDRESS);
			expect(msg.Subject).toBe(subject);
			expect(msg.From.Address).toBe(email);
			expect(msg.From.Name).toBe(name);

			const { Text: text } = await emailService.getMessage(msg.ID);
			expect(text).toContain(message);
		});

		test("should display error message when sending contact form submission fails", async ({
			createContactPage,
			createEmailService,
			request,
		}) => {
			// TODO: run for all locales?
			const locale = defaultLocale;

			const emailService = createEmailService();

			const { contactPage, i18n } = await createContactPage(locale);
			await contactPage.goto();

			//  CHAOS
			const chaosResponse = await request.put(
				String(
					createUrl({
						baseUrl: env.MAILPIT_API_BASE_URL!,
						pathname: "/api/v1/chaos",
					}),
				),
				{
					data: {
						Recipient: { ErrorCode: 451, Probability: 100 },
						Sender: { ErrorCode: 451, Probability: 100 },
					},
				},
			);
			expect(chaosResponse.ok()).toBeTruthy();
			//  CHAOS

			try {
				const name = "Firstname Lastname";
				const email = "user@example.com";
				const subject = "Testing form submission";
				const message = `The current time is ${new Date().toISOString()}.`;

				await contactPage.form.name.fill(name);
				await contactPage.form.email.fill(email);
				await contactPage.form.subject.fill(subject);
				await contactPage.form.message.fill(message);
				await contactPage.form.submit.click();

				await expect(contactPage.page.getByRole("status")).toContainText(
					i18n.t("actions.sendContactFormEmailAction.error"),
					{ timeout: 5000 },
				);

				const data = await emailService.getMessages();

				expect(data.total).toBe(0);
			} finally {
				await request.put(
					String(
						createUrl({
							baseUrl: env.MAILPIT_API_BASE_URL!,
							pathname: "/api/v1/chaos",
						}),
					),
					{
						data: {
							Recipient: { Probability: 0 },
							Sender: { Probability: 0 },
						},
					},
				);
			}
		});
	});
});
