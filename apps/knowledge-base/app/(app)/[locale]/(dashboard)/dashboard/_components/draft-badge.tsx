"use client";

import { Badge } from "@dariah-eric/ui/badge";
import { ListBoxDescription, ListBoxLabel } from "@dariah-eric/ui/list-box";
import type { AsyncOption } from "@dariah-eric/ui/use-async-options";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

/**
 * Marks a person or institution that has never been published. Coordinators can create, relate and
 * report such entries before an administrator publishes them, but they do not appear on the website
 * yet.
 */
export function DraftBadge(): ReactNode {
	const t = useExtracted();

	return <Badge intent="warning">{t("Draft")}</Badge>;
}

interface NameWithDraftBadgeProps {
	name: string;
	isDraft?: boolean;
}

/** A name, truncated, followed by a `DraftBadge` when the entry has never been published. */
export function NameWithDraftBadge(props: Readonly<NameWithDraftBadgeProps>): ReactNode {
	const { name, isDraft = false } = props;

	return (
		<span className="flex items-center gap-x-2 min-inline-0">
			<span className="truncate" title={name}>
				{name}
			</span>
			{isDraft ? <DraftBadge /> : null}
		</span>
	);
}

/** A picker option that may be a never-published entry. */
export interface DraftAwareOption extends AsyncOption {
	isDraft?: boolean;
}

/**
 * `AsyncSelect` `renderItem` for options that may be drafts (see `DraftBadge`). The badge goes in
 * the description slot, so the option's accessible name stays the plain name and "Draft" is read as
 * its description.
 */
export function renderDraftAwareOption(item: DraftAwareOption): ReactNode {
	const hasDescription = item.description != null && item.description !== "";

	return (
		<Fragment>
			<ListBoxLabel className="truncate">{item.name}</ListBoxLabel>
			{hasDescription || item.isDraft === true ? (
				<ListBoxDescription className="flex items-center gap-x-2">
					{hasDescription ? <span className="truncate">{item.description}</span> : null}
					{item.isDraft === true ? <DraftBadge /> : null}
				</ListBoxDescription>
			) : null}
		</Fragment>
	);
}
