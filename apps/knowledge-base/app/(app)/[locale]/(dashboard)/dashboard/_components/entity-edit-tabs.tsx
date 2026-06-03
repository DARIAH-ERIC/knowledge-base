"use client";

import { Tab, type TabProps, Tabs } from "@dariah-eric/ui/tabs";
import type { ReactNode } from "react";

import { LocaleLink, useSearchParams } from "@/lib/navigation/navigation";

interface EntityEditTabsProps {
	/** Tab id selected when no `?tab=` search param is present. */
	defaultTab: string;
	children: ReactNode;
}

/**
 * Tabs for the entity edit screens whose selected tab is reflected in the `?tab=` search param, so
 * it survives a refresh and can be deep-linked.
 */
export function EntityEditTabs(props: Readonly<EntityEditTabsProps>): ReactNode {
	const { defaultTab, children } = props;

	const searchParams = useSearchParams();
	const selectedKey = searchParams.get("tab") ?? defaultTab;

	return <Tabs selectedKey={selectedKey}>{children}</Tabs>;
}

interface EntityEditTabProps extends Omit<TabProps, "href" | "render"> {
	id: string;
}

export function EntityEditTab(props: Readonly<EntityEditTabProps>): ReactNode {
	const { id, ...rest } = props;

	return (
		<Tab
			{...rest}
			href={`?tab=${id}`}
			id={id}
			render={(domProps, renderProps) => {
				if ("href" in domProps && domProps.href && !renderProps.isDisabled) {
					return <LocaleLink {...domProps} shallow={true} />;
				}

				return (
					<div
						{...domProps}
						// @ts-expect-error -- Link may be disabled but have `href`.
						href={undefined}
					/>
				);
			}}
		/>
	);
}
