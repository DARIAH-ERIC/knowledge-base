import cn from "clsx/lite";
import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";

import { ColorSchemeSelect } from "@/app/(app)/[locale]/_components/color-scheme-select";
// import { LocaleSelect } from "@/app/(app)/[locale]/_components/locale-select";
import { Navigation } from "@/app/(app)/[locale]/(default)/_components/navigation";
import { UserMenu } from "@/app/(app)/[locale]/(default)/_components/user-menu";
import { Link } from "@/components/link";
import { getCurrentSession } from "@/lib/auth/session";
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
		<header {...rest} className={cn("border-b border-stroke-weak", className)}>
			<div className="container flex items-center justify-between gap-x-12 px-8 py-4 xs:px-16">
				<Navigation label={label} navigation={navigation} />

				<div className="flex items-center gap-x-6 ml-auto">
					<ColorSchemeSelect />
					{/* <LocaleSelect /> */}
					<User />
				</div>
			</div>
		</header>
	);
}

async function User(): Promise<ReactNode> {
	const { session, user } = await getCurrentSession();

	if (session == null) {
		return (
			<div>
				{/* eslint-disable-next-line react/jsx-no-literals */}
				<Link href="/auth/sign-in">Sign in</Link>
			</div>
		);
	}

	return (
		<div>
			<UserMenu user={user} />
		</div>
	);
}
