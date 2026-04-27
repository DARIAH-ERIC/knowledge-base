"use client";

import { Button } from "@dariah-eric/ui/button";
import { fieldErrorStyles, fieldStyles, Label } from "@dariah-eric/ui/field";
import { ListBox, ListBoxDescription, ListBoxItem, ListBoxLabel } from "@dariah-eric/ui/list-box";
import { Popover, PopoverContent } from "@dariah-eric/ui/popover";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
import { Tag, TagGroup, TagList } from "@dariah-eric/ui/tag-group";
import { ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useExtracted } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";

import {
	type AsyncOption,
	type AsyncOptionsFetchPage,
	useAsyncOptions,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-async-options";

const defaultPageSize = 20;
const emptySelectedItems: Array<never> = [];

interface AsyncMultipleSelectProps<T extends AsyncOption> {
	"aria-label": string;
	emptyMessage?: string;
	errorMessage?: string;
	fetchPage: AsyncOptionsFetchPage<T>;
	initialItems: Array<T>;
	initialTotal: number;
	inputPlaceholder?: string;
	isDisabled?: boolean;
	label?: string;
	onChange: (ids: Array<string>) => void;
	pageSize?: number;
	placeholder?: string;
	renderItem?: (item: T) => ReactNode;
	selectedItems?: Array<T>;
	value: Array<string>;
	cacheKey?: string | number;
}

function renderDefaultItem(item: AsyncOption): ReactNode {
	if (item.description == null || item.description === "") {
		return <ListBoxLabel>{item.name}</ListBoxLabel>;
	}

	return (
		<div className="col-start-2">
			<ListBoxLabel>{item.name}</ListBoxLabel>
			<ListBoxDescription>{item.description}</ListBoxDescription>
		</div>
	);
}

export function AsyncMultipleSelect<T extends AsyncOption>(
	props: Readonly<AsyncMultipleSelectProps<T>>,
): ReactNode {
	const { cacheKey, ...rest } = props;

	return <AsyncMultipleSelectInner key={String(cacheKey ?? "default")} {...rest} />;
}

interface AsyncMultipleSelectInnerProps<T extends AsyncOption> extends Omit<
	AsyncMultipleSelectProps<T>,
	"cacheKey"
> {}

function AsyncMultipleSelectInner<T extends AsyncOption>(
	props: Readonly<AsyncMultipleSelectInnerProps<T>>,
): ReactNode {
	const {
		"aria-label": ariaLabel,
		emptyMessage,
		errorMessage,
		fetchPage,
		initialItems,
		initialTotal,
		inputPlaceholder,
		isDisabled = false,
		label,
		onChange,
		pageSize = defaultPageSize,
		placeholder,
		renderItem,
		selectedItems = emptySelectedItems,
		value,
	} = props;

	const t = useExtracted();

	const [isOpen, setIsOpen] = useState(false);
	const [localSelectedItems, setLocalSelectedItems] = useState<Array<T>>(emptySelectedItems);

	const {
		displayedItems,
		handleNext,
		handlePrev,
		handleSearch,
		hasNext,
		hasPrev,
		isPending,
		loadError,
		searchText,
		setSearchText,
	} = useAsyncOptions({
		fetchPage,
		initialItems,
		initialTotal,
		pageSize,
	});

	const selectedItemMap = useMemo(() => {
		const map = new Map<string, AsyncOption>();

		for (const item of selectedItems) {
			map.set(item.id, item);
		}

		for (const item of localSelectedItems) {
			map.set(item.id, item);
		}

		for (const item of initialItems) {
			if (value.includes(item.id)) {
				map.set(item.id, item);
			}
		}

		for (const item of displayedItems) {
			if (value.includes(item.id)) {
				map.set(item.id, item);
			}
		}

		return map;
	}, [displayedItems, initialItems, localSelectedItems, selectedItems, value]);

	const resolvedSelectedItems = useMemo(() => {
		return value.map((id) => {
			return selectedItemMap.get(id) ?? { id, name: id };
		});
	}, [selectedItemMap, value]);

	const renderOption = renderItem ?? renderDefaultItem;
	const loadErrorMessage =
		loadError != null && loadError.message !== ""
			? loadError.message
			: t("Could not load options.");

	return (
		<div className={fieldStyles()}>
			{label != null ? <Label>{label}</Label> : null}

			<Popover isOpen={isOpen} onOpenChange={setIsOpen}>
				<Button
					className="min-h-10 w-full justify-between gap-3 py-2 font-normal"
					intent="outline"
					isDisabled={isDisabled}
					type="button"
				>
					<div className="flex min-w-0 flex-1 flex-wrap gap-1 text-start">
						{resolvedSelectedItems.length > 0 ? (
							resolvedSelectedItems.map((item) => {
								return (
									<span
										key={item.id}
										className="inline-flex items-center rounded-md border bg-muted px-2 py-0.5 text-xs font-medium text-fg"
									>
										{item.name}
									</span>
								);
							})
						) : (
							<span className="text-muted-fg">{placeholder ?? t("No selected items")}</span>
						)}
					</div>
					<ChevronUpDownIcon className="size-4 shrink-0 text-muted-fg" />
				</Button>

				<PopoverContent className="w-(--trigger-width) p-3">
					<div className="flex flex-col gap-3">
						{resolvedSelectedItems.length > 0 ? (
							<TagGroup
								aria-label={t("Selected items")}
								onRemove={(keys) => {
									onChange(
										value.filter((id) => {
											return !keys.has(id);
										}),
									);
								}}
							>
								<TagList items={resolvedSelectedItems}>
									{(item) => {
										return <Tag className="rounded-md">{item.name}</Tag>;
									}}
								</TagList>
							</TagGroup>
						) : null}

						<div className="flex gap-2">
							<SearchField
								className="flex-1"
								onChange={setSearchText}
								onSubmit={handleSearch}
								value={searchText}
							>
								<SearchInput autoFocus={true} placeholder={inputPlaceholder ?? t("Search")} />
							</SearchField>
							<Button intent="outline" isDisabled={isPending} onPress={handleSearch} type="button">
								{t("Search")}
							</Button>
						</div>

						{loadError != null ? (
							<p className="py-3 text-center text-danger-subtle-fg text-sm">{loadErrorMessage}</p>
						) : displayedItems.length > 0 ? (
							<div className="relative">
								<ListBox
									aria-label={ariaLabel}
									className={isPending ? "opacity-50" : undefined}
									items={displayedItems}
									onSelectionChange={(keys) => {
										if (keys === "all") {
											return;
										}

										const nextValue = [...keys].map(String);
										const nextSelectedKeys = new Set(nextValue);

										setLocalSelectedItems((previousItems) => {
											const map = new Map(
												previousItems.map((item) => {
													return [item.id, item] as const;
												}),
											);

											for (const item of displayedItems) {
												if (nextSelectedKeys.has(item.id)) {
													map.set(item.id, item);
												}
											}

											return [...map.values()];
										});

										onChange(nextValue);
									}}
									selectedKeys={new Set(value)}
									selectionBehavior="toggle"
									selectionMode="multiple"
								>
									{(item) => {
										return (
											<ListBoxItem id={item.id} textValue={item.name}>
												{renderOption(item)}
											</ListBoxItem>
										);
									}}
								</ListBox>

								{isPending ? (
									<div className="absolute inset-0 flex items-center justify-center">
										<ProgressCircle aria-label={t("Loading...")} isIndeterminate={true} />
									</div>
								) : null}
							</div>
						) : isPending ? (
							<div className="flex items-center justify-center py-6">
								<ProgressCircle aria-label={t("Loading...")} isIndeterminate={true} />
							</div>
						) : (
							<p className="py-3 text-center text-muted-fg text-sm">
								{emptyMessage ?? t("No options found.")}
							</p>
						)}

						<div className="flex justify-between gap-2">
							<Button
								intent="outline"
								isDisabled={!hasPrev || isPending}
								onPress={handlePrev}
								type="button"
							>
								{t("Previous")}
							</Button>
							<Button
								intent="outline"
								isDisabled={!hasNext || isPending}
								onPress={handleNext}
								type="button"
							>
								{t("Next")}
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>

			{errorMessage != null && errorMessage !== "" ? (
				<div className={fieldErrorStyles()}>{errorMessage}</div>
			) : null}
		</div>
	);
}
