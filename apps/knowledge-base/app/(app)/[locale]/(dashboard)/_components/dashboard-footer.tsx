import cn from "clsx/lite";
import { connection } from "next/server";
import { useTranslations } from "next-intl";
import { type ComponentProps, type ReactNode, Suspense } from "react";

// import { Logo } from "@/components/logo";
// import { NavLink } from "@/components/nav-link";
import { useMetadata } from "@/lib/i18n/metadata";
import { createHref } from "@/lib/navigation/create-href";
import type { NavigationConfig, NavigationLink } from "@/lib/navigation/navigation";
import { config as socialMediaConfig } from "@/lib/social-media/social-media.config";

interface DashboardFooterProps extends ComponentProps<"footer"> {}

export function DashboardFooter(props: Readonly<DashboardFooterProps>): ReactNode {
	const { className, ...rest } = props;

	const t = useTranslations("DashboardFooter");
	const meta = useMetadata();

	const _links = {
		contact: {
			type: "link",
			href: createHref({ pathname: "/contact" }),
			label: t("navigation.items.contact"),
		},
		imprint: {
			type: "link",
			href: createHref({ pathname: "/imprint" }),
			label: t("navigation.items.imprint"),
		},
	} satisfies Record<string, NavigationLink>;

	const socialMedia: NavigationConfig = {};

	for (const [_kind, href] of Object.entries(meta.social)) {
		const kind = _kind as keyof typeof meta.social;

		const label = t(`navigation-social-media.items.${kind}`);
		const Icon = socialMediaConfig[kind].icon;

		socialMedia[kind] = {
			type: "link",
			href,
			label,
			icon: <Icon />,
		};
	}

	return (
		<footer {...rest} className={cn("", className)}>
			<Suspense>
				<CurrentYear />
			</Suspense>
		</footer>
	);
}

async function CurrentYear() {
	// "use cache";

	/** Ensure `new Date()` is computed at request time. */
	await connection();

	return <span>{new Date().getUTCFullYear()}</span>;
}
