"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { useExtracted } from "next-intl";
import React, { Children, Fragment, type ReactNode, isValidElement, useMemo, useRef } from "react";
import {
	Autocomplete,
	Select,
	type SelectProps,
	SelectValue,
	useFilter,
} from "react-aria-components";

import { Button } from "@/lib/button";
import { fieldStyles } from "@/lib/field";
import { ListBox, ListBoxItem } from "@/lib/list-box";
import { PopoverContent } from "@/lib/popover";
import { cx } from "@/lib/primitive";
import { SearchField, SearchInput } from "@/lib/search-field";
import { Tag, TagGroup, TagList } from "@/lib/tag-group";

interface OptionBase {
	id: string | number;
	name: string;
}

interface MultipleSelectProps<T extends OptionBase> extends Omit<
	SelectProps<T, "multiple">,
	"onSelectionChange" | "selectionMode" | "children"
> {
	placeholder?: string;
	className?: string;
	children?: React.ReactNode;
	name?: string;
}

interface MultipleSelectContentProps<T extends OptionBase> {
	items: Iterable<T>;
	children: (item: T) => React.ReactNode;
}

export function MultipleSelectContent<T extends OptionBase>(
	_props: Readonly<MultipleSelectContentProps<T>>,
): ReactNode {
	return null;
}

MultipleSelectContent.displayName = "MultipleSelectContent";

export function MultipleSelect<T extends OptionBase>(
	props: Readonly<MultipleSelectProps<T>>,
): ReactNode {
	const { placeholder = "No selected items", className, children, name, ...rest } = props;

	const t = useExtracted("ui");

	const triggerRef = useRef<HTMLDivElement | null>(null);

	const { contains } = useFilter({ sensitivity: "base" });

	const { before, after, list } = useMemo(() => {
		const arr = Children.toArray(children);
		const idx = arr.findIndex(
			// @ts-expect-error -- display name
			// oxlint-disable-next-line typescript/no-unnecessary-condition
			(c) => isValidElement(c) && c.type?.displayName === "MultipleSelectContent",
		);
		if (idx === -1) {
			return { before: arr, after: [], list: null as null | MultipleSelectContentProps<T> };
		}
		const el = arr[idx] as React.ReactElement<MultipleSelectContentProps<T>>;
		return { before: arr.slice(0, idx), after: arr.slice(idx + 1), list: el.props };
	}, [children]);

	return (
		<Select
			className={cx(fieldStyles(), className)}
			data-slot="control"
			name={name}
			selectionMode="multiple"
			{...rest}
		>
			{before}
			{list && (
				<Fragment>
					<div
						ref={triggerRef}
						className="flex inline-full items-center gap-2 rounded-lg border p-1"
						data-slot="control"
					>
						<SelectValue<T> className="flex-1">
							{({ selectedItems, state }) => (
								<TagGroup
									aria-label={t("Selected items")}
									onRemove={(keys) => {
										if (Array.isArray(state.value)) {
											// oxlint-disable-next-line typescript/no-unsafe-argument
											state.setValue(state.value.filter((k) => !keys.has(k)));
										}
									}}
								>
									<TagList
										items={selectedItems.filter((i) => i != null)}
										renderEmptyState={() => (
											<i className="ps-2 text-muted-fg text-sm">{placeholder}</i>
										)}
									>
										{(item) => <Tag className="rounded-md">{item.name}</Tag>}
									</TagList>
								</TagGroup>
							)}
						</SelectValue>
						<Button
							aria-label={t("Open options")}
							className="self-end rounded-[calc(var(--radius-lg)-(--spacing(1)))]"
							intent="secondary"
							size="sq-xs"
						>
							<PlusIcon />
						</Button>
					</div>
					<PopoverContent
						className="flex inline-full flex-col"
						placement="bottom"
						triggerRef={triggerRef}
					>
						<Autocomplete filter={contains}>
							<SearchField autoFocus={true} className="rounded-none outline-hidden">
								<SearchInput className="border-none outline-hidden focus:ring-0" />
							</SearchField>
							<ListBox
								className="rounded-t-none border-0 border-bs bg-transparent shadow-none"
								items={list.items}
							>
								{list.children}
							</ListBox>
						</Autocomplete>
					</PopoverContent>
				</Fragment>
			)}
			{after}
		</Select>
	);
}

export const MultipleSelectItem = ListBoxItem;
