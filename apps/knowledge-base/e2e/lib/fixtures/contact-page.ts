/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { expect, type Locator, type Page } from "@playwright/test";

import type { I18n } from "@/e2e/lib/fixtures/i18n";
import { defaultLocale, type IntlLocale } from "@/lib/i18n/locales";
import { localePrefix } from "@/lib/i18n/routing";
// import { getPathname } from "@/lib/i18n/navigation";

/** @see {@link https://github.com/microsoft/playwright/issues/35162} */
function getPathname({ href, locale }: { href: { pathname: string }; locale: IntlLocale }): string {
	return localePrefix.prefixes[locale] + href.pathname;
}

export class ContactPage {
	readonly page: Page;
	readonly locale: IntlLocale;
	readonly i18n: I18n;
	readonly url: string;
	readonly mainContent: Locator;
	readonly title: Locator;
	readonly skipLink: Locator;

	readonly form: {
		email: Locator;
		message: Locator;
		name: Locator;
		subject: Locator;
		submit: Locator;
	};

	constructor(page: Page, locale = defaultLocale, i18n: I18n) {
		this.page = page;
		this.locale = locale;
		this.i18n = i18n;
		this.url = getPathname({ href: { pathname: "/contact" }, locale });
		this.mainContent = page.getByRole("main");
		this.title = page.getByRole("heading", { level: 1 });
		this.skipLink = page.getByRole("link", { name: i18n.t("DefaultLayout.skip-link") });

		this.form = {
			email: page.getByRole("textbox", { name: i18n.t("ContactForm.email") }),
			message: page.getByRole("textbox", { name: i18n.t("ContactForm.message") }),
			name: page.getByRole("textbox", { name: i18n.t("ContactForm.name") }),
			subject: page.getByRole("textbox", { name: i18n.t("ContactForm.subject") }),
			submit: page.getByRole("button", { name: i18n.t("ContactForm.submit") }),
		};
	}

	goto() {
		return this.page.goto(this.url);
	}
	/*https://github.com/microsoft/playwright/issues/36395#issuecomment-2995675184*/
	fillPolling = async (locator: Locator, value: string) => {
		await expect
			.poll(async () => {
				await locator.fill(value);
				return await locator.inputValue();
			})
			.toEqual(value);
	};
}
