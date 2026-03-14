import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

import { ColorSchemeSelect as ClientColorSchemeSelect } from "@/app/(app)/[locale]/_components/color-scheme-select.client";
import type { ColorScheme } from "@/lib/color-scheme/color-scheme-script";

export function ColorSchemeSelect(): ReactNode {
	const t = useExtracted();

	const items: Record<ColorScheme | "system", string> = {
		system: t("System"),
		light: t("Light"),
		dark: t("Dark"),
	};

	const label = t("Change color scheme");

	return <ClientColorSchemeSelect items={items} label={label} />;
}
