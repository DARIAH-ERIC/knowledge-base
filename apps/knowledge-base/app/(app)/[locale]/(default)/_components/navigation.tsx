import type { ReactNode } from "react";

import { NavLink } from "@/app/(app)/[locale]/(default)/_components/nav-link";
import { Logo } from "@/components/logo";
import type { NavigationConfig, NavigationLink } from "@/lib/navigation/navigation";

interface NavigationProps {
	label: string;
	navigation: NavigationConfig & { home: NavigationLink };
}

export function Navigation(props: Readonly<NavigationProps>): ReactNode {
	const { label, navigation } = props;

	return (
		<nav aria-label={label} className="flex">
			<NavLink href={navigation.home.href} size="icon">
				<span className="sr-only">{navigation.home.label}</span>
				<Logo className="block-8 inline-auto" />
			</NavLink>
		</nav>
	);
}
