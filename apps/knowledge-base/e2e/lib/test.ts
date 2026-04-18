/* eslint-disable react-hooks/rules-of-hooks */

import { createUrl } from "@acdh-oeaw/lib";
import { test as base } from "@playwright/test";

import { env } from "@/config/env.config";
import { type AccessibilityScanner, createAccessibilityScanner } from "@/e2e/lib/fixtures/a11y";
import { AdminPersonsPage } from "@/e2e/lib/fixtures/admin-persons-page";
import { AdminProjectsPage } from "@/e2e/lib/fixtures/admin-projects-page";
import { AdminWorkingGroupsPage } from "@/e2e/lib/fixtures/admin-working-groups-page";
import { ContactPage } from "@/e2e/lib/fixtures/contact-page";
import { DatabaseService } from "@/e2e/lib/fixtures/database-service";
import { createEmailService, type EmailService } from "@/e2e/lib/fixtures/email-service";
import { createI18n, type I18n, type WithI18n } from "@/e2e/lib/fixtures/i18n";
import { ImprintPage } from "@/e2e/lib/fixtures/imprint-page";
import { IndexPage } from "@/e2e/lib/fixtures/index-page";
import { WebsiteEventsPage } from "@/e2e/lib/fixtures/website-events-page";
import { WebsiteImpactCaseStudiesPage } from "@/e2e/lib/fixtures/website-impact-case-studies-page";
import { WebsiteNewsPage } from "@/e2e/lib/fixtures/website-news-page";
import { WebsitePagesPage } from "@/e2e/lib/fixtures/website-pages-page";
import { WebsiteSpotlightArticlesPage } from "@/e2e/lib/fixtures/website-spotlight-articles-page";
import { defaultLocale, type IntlLocale } from "@/lib/i18n/locales";

interface TestFixtures {
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	beforeEachTest: void;

	createAccessibilityScanner: () => Promise<AccessibilityScanner>;
	createEmailService: () => EmailService;
	createI18n: (locale: IntlLocale) => Promise<I18n>;
	createContactPage: (locale: IntlLocale) => Promise<WithI18n<{ contactPage: ContactPage }>>;
	createImprintPage: (locale: IntlLocale) => Promise<WithI18n<{ imprintPage: ImprintPage }>>;
	createIndexPage: (locale: IntlLocale) => Promise<WithI18n<{ indexPage: IndexPage }>>;
	createAdminPersonsPage: (workerIndex: number) => AdminPersonsPage;
	createAdminProjectsPage: (workerIndex: number) => AdminProjectsPage;
	createAdminWorkingGroupsPage: (workerIndex: number) => AdminWorkingGroupsPage;
	createWebsiteEventsPage: (workerIndex: number) => WebsiteEventsPage;
	createWebsiteImpactCaseStudiesPage: (workerIndex: number) => WebsiteImpactCaseStudiesPage;
	createWebsiteNewsPage: (workerIndex: number) => WebsiteNewsPage;
	createWebsitePagesPage: (workerIndex: number) => WebsitePagesPage;
	createWebsiteSpotlightArticlesPage: (workerIndex: number) => WebsiteSpotlightArticlesPage;
}

interface WorkerFixtures {
	db: DatabaseService;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
	/** @see {@link https://playwright.dev/docs/test-fixtures#adding-global-beforeeachaftereach-hooks} */
	beforeEachTest: [
		async ({ context }, use) => {
			if (env.NEXT_PUBLIC_APP_MATOMO_BASE_URL != null) {
				/**
				 * If we were to block loading the actual matomo javascript snippet, we would need to
				 * check if `windows._paq` was pushed to (because no requests to `matomo.php`
				 * would be dispatched).
				 */
				// const scriptUrl = String(
				// 	createUrl({ baseUrl: env.NEXT_PUBLIC_APP_MATOMO_BASE_URL, pathname: "/matomo.js" }),
				// );

				// await context.route(scriptUrl, (route) => {
				// 	return route.fulfill({ status: 200, body: "" });
				// });

				const baseUrl = String(
					createUrl({
						baseUrl: env.NEXT_PUBLIC_APP_MATOMO_BASE_URL,
						pathname: "/matomo.php?**",
					}),
				);

				await context.route(baseUrl, (route) => {
					return route.fulfill({ status: 204, body: "" });
				});
			}

			await use();
		},
		{ auto: true },
	],

	async createAccessibilityScanner({ page }, use) {
		await use(() => {
			return createAccessibilityScanner(page);
		});
	},

	async createEmailService({ request }, use) {
		await use(() => {
			return createEmailService(request);
		});
	},

	async createI18n({ page }, use) {
		await use((locale) => {
			return createI18n(page, locale);
		});
	},

	async createContactPage({ page }, use) {
		async function createContactPage(locale = defaultLocale) {
			const i18n = await createI18n(page, locale);
			const contactPage = new ContactPage(page, locale, i18n);
			return { i18n, contactPage };
		}

		await use(createContactPage);
	},

	async createImprintPage({ page }, use) {
		async function createImprintPage(locale = defaultLocale) {
			const i18n = await createI18n(page, locale);
			const imprintPage = new ImprintPage(page, locale, i18n);
			return { i18n, imprintPage };
		}

		await use(createImprintPage);
	},

	async createIndexPage({ page }, use) {
		async function createIndexPage(locale = defaultLocale) {
			const i18n = await createI18n(page, locale);
			const indexPage = new IndexPage(page, locale, i18n);
			return { i18n, indexPage };
		}

		await use(createIndexPage);
	},

	async createAdminProjectsPage({ page }, use) {
		await use((workerIndex: number) => {
			return new AdminProjectsPage(page, workerIndex);
		});
	},

	async createAdminPersonsPage({ page }, use) {
		await use((workerIndex: number) => {
			return new AdminPersonsPage(page, workerIndex);
		});
	},

	async createAdminWorkingGroupsPage({ page }, use) {
		await use((workerIndex: number) => {
			return new AdminWorkingGroupsPage(page, workerIndex);
		});
	},

	async createWebsiteEventsPage({ page }, use) {
		await use((workerIndex: number) => {
			return new WebsiteEventsPage(page, workerIndex);
		});
	},

	async createWebsiteImpactCaseStudiesPage({ page }, use) {
		await use((workerIndex: number) => {
			return new WebsiteImpactCaseStudiesPage(page, workerIndex);
		});
	},

	async createWebsiteNewsPage({ page }, use) {
		await use((workerIndex: number) => {
			return new WebsiteNewsPage(page, workerIndex);
		});
	},

	async createWebsitePagesPage({ page }, use) {
		await use((workerIndex: number) => {
			return new WebsitePagesPage(page, workerIndex);
		});
	},

	async createWebsiteSpotlightArticlesPage({ page }, use) {
		await use((workerIndex: number) => {
			return new WebsiteSpotlightArticlesPage(page, workerIndex);
		});
	},

	db: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			const db = new DatabaseService();
			await use(db);
			await db.close();
		},
		{ scope: "worker" },
	],
});

export { expect } from "@playwright/test";
