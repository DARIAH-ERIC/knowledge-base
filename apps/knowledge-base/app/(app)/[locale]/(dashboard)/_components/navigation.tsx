import type { ReactNode } from "react";

import type { NavigationConfig } from "@/lib/navigation/navigation";

interface NavigationProps {
	label: string;
	navigation: NavigationConfig;
}

export function Navigation(props: Readonly<NavigationProps>): ReactNode {
	const { label, navigation } = props;

	return (
		<nav aria-label={label}>
			<ul role="list">
				{Object.entries(navigation).map(([id, item]) => {
					switch (item.type) {
						case "action": {
							return <li key={id}></li>;
						}

						case "link": {
							return <li key={id}></li>;
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
