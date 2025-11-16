import cn from "clsx/lite";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import type { NavigationConfig, NavigationLink } from "@/lib/navigation/navigation";

interface NavigationProps {
	label: string;
	navigation: NavigationConfig & { home: NavigationLink };
}

export function Navigation(props: Readonly<NavigationProps>): ReactNode {
	const { label, navigation } = props;

	return (
		<nav aria-label={label} className="hidden lg:flex lg:gap-x-6">
			<NavLink
				className={cn(
					"-ml-1 inline-grid shrink-0 place-content-center self-center rounded-xs p-1 text-muted-fg transition duration-200",
					"touch-target",
					"hover:text-fg",
					"outline-2 outline-offset-2 outline-transparent focus-visible:outline-ring",
				)}
				href={navigation.home.href}
			>
				<span className="sr-only">{navigation.home.label}</span>
				<Logo className="h-8 w-auto" />
			</NavLink>

			<ul className="flex flex-wrap items-center" role="list">
				{Object.entries(navigation).map(([id, item]) => {
					switch (item.type) {
						case "action": {
							return <li key={id}></li>;
						}

						case "link": {
							return (
								<li key={id}>
									<NavLink
										className={cn(
											"inline-flex items-center gap-x-2 rounded-xs px-2.5 py-1 text-sm font-medium tracking-tight text-muted-fg transition duration-200",
											"hover:text-fg",
											"outline-2 outline-offset-2 outline-transparent focus-visible:outline-ring",
										)}
										href={item.href}
									>
										{item.label}
									</NavLink>
								</li>
							);
						}

						case "menu": {
							return <li key={id}></li>;
						}

						case "separator": {
							return <li key={id}></li>;
						}
					}
				})}
			</ul>
		</nav>
	);
}
