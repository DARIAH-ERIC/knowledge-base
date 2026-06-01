"use client";

import { Tabs } from "@dariah-eric/ui/tabs";
import { type ReactNode, useState } from "react";
import type { Key } from "react-aria-components";

import { useSearchParams } from "@/lib/navigation/navigation";

interface EntityEditTabsProps {
	/** Tab id selected when no `?tab=` search param is present. */
	defaultTab: string;
	children: ReactNode;
}

/**
 * Tabs for the entity edit screens whose selected tab is reflected in the `?tab=` search param, so
 * it survives a refresh and can be deep-linked.
 *
 * The tab is switched client-side via the History API rather than a router navigation: every panel
 * is already rendered on the client, so there is no need to re-run the page's server data loading
 * when the editor flips between the entity (lifecycle-bound) tab and a decoupled relation tab.
 */
export function EntityEditTabs(props: Readonly<EntityEditTabsProps>): ReactNode {
	const { defaultTab, children } = props;

	const searchParams = useSearchParams();
	const [selectedKey, setSelectedKey] = useState<Key>(() => searchParams.get("tab") ?? defaultTab);

	function handleSelectionChange(key: Key) {
		setSelectedKey(key);

		const params = new URLSearchParams(window.location.search);
		params.set("tab", String(key));
		window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
	}

	return (
		<Tabs onSelectionChange={handleSelectionChange} selectedKey={selectedKey}>
			{children}
		</Tabs>
	);
}
