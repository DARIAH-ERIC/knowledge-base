import cn from "clsx/lite";
import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";

import { ColorSchemeSelect } from "@/app/(app)/[locale]/_components/color-scheme-select";
// import { LocaleSelect } from "@/app/(app)/[locale]/_components/locale-select";
import { Navigation } from "@/app/(app)/[locale]/(default)/_components/navigation";
import { createHref } from "@/lib/navigation/create-href";
import type { NavigationConfig } from "@/lib/navigation/navigation";

interface DefaultHeaderProps extends ComponentProps<"header"> {}

export function DefaultHeader(props: Readonly<DefaultHeaderProps>): ReactNode {
	const { className, ...rest } = props;

	const t = useTranslations("DefaultHeader");

	const label = t("navigation.label");

	const navigation = {
		home: {
			type: "link",
			href: createHref({ pathname: "/" }),
			label: t("navigation.items.home"),
		},
	} satisfies NavigationConfig;

	return (
		<header {...rest} className={cn("", className)}>
			<Navigation label={label} navigation={navigation} />

			<div>
				<ColorSchemeSelect />
				{/* <LocaleSelect /> */}
			</div>
		</header>
	);
}
