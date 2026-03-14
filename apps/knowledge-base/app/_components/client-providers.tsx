"use client";

import { type UiContextValue, UiProvider } from "@dariah-eric/ui/ui-provider";
import type { ReactNode } from "react";
import { I18nProvider as AriaI18nProvider } from "react-aria-components";

import type { IntlLocale } from "@/lib/i18n/locales";
import { LocaleLink } from "@/lib/navigation/navigation";

const ui: UiContextValue = {
	LinkComponent: LocaleLink,
};

interface ClientProvidersProps {
	children: ReactNode;
	locale: IntlLocale;
}

export function ClientProviders(props: Readonly<ClientProvidersProps>): ReactNode {
	const { children, locale } = props;

	return (
		<AriaI18nProvider locale={locale}>
			<UiProvider value={ui}>{children}</UiProvider>
		</AriaI18nProvider>
	);
}
