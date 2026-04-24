"use client";

import { Button } from "@dariah-eric/ui/button";
import { fieldErrorStyles, fieldStyles, Label } from "@dariah-eric/ui/field";
import { ListBox, ListBoxDescription, ListBoxItem, ListBoxLabel } from "@dariah-eric/ui/list-box";
import { Popover, PopoverContent } from "@dariah-eric/ui/popover";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
import { ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useExtracted } from "next-intl";
import { type ReactNode, useState } from "react";

import {
	type AsyncOption,
	type AsyncOptionsFetchPage,
	useAsyncOptions,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-async-options";

const defaultPageSize = 20;

interface AsyncOptionPickerProps<T extends AsyncOption> {
	"aria-label": string;
	emptyMessage?: string;
	errorMessage?: string;
	fetchPage: AsyncOptionsFetchPage<T>;
	initialItems: Array<T>;
	initialTotal: number;
	inputPlaceholder?: string;
	isDisabled?: boolean;
	label?: string;
	loadOnMount?: boolean;
	onSelect: (item: T) => void;
	pageSize?: number;
	placeholder: string;
	renderItem?: (item: T) => ReactNode;
	selectedItem: T | null;
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

export function AsyncOptionPicker<T extends AsyncOption>(
	props: Readonly<AsyncOptionPickerProps<T>>,
): ReactNode {
	const { cacheKey, ...rest } = props;

	return <AsyncOptionPickerInner key={String(cacheKey ?? "default")} {...rest} />;
}

interface AsyncOptionPickerInnerProps<T extends AsyncOption> extends Omit<
	AsyncOptionPickerProps<T>,
	"cacheKey"
> {}

function AsyncOptionPickerInner<T extends AsyncOption>(
	props: Readonly<AsyncOptionPickerInnerProps<T>>,
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
		loadOnMount = false,
		onSelect,
		pageSize = defaultPageSize,
		placeholder,
		renderItem,
		selectedItem,
	} = props;

	const t = useExtracted();

	const [isOpen, setIsOpen] = useState(false);

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

	const renderOption = renderItem ?? renderDefaultItem;
	const loadErrorMessage =
		loadError != null && loadError.message !== ""
			? loadError.message
			: t("Could not load options.");

	return (
		<div className={fieldStyles()}>
			{label != null ? <Label>{label}</Label> : null}

			<Popover
				isOpen={isOpen}
				onOpenChange={(open) => {
					setIsOpen(open);

					if (open && loadOnMount && initialItems.length === 0) {
						handleSearch();
					}
				}}
			>
				<Button
					className="w-full justify-between font-normal"
					intent="outline"
					isDisabled={isDisabled}
					type="button"
				>
					<span className={selectedItem == null ? "text-muted-fg" : undefined}>
						{selectedItem?.name ?? placeholder}
					</span>
					<ChevronUpDownIcon className="size-4 text-muted-fg" />
				</Button>

				<PopoverContent className="w-(--trigger-width) p-3">
					<div className="flex flex-col gap-3">
						<form
							className="flex gap-2"
							onSubmit={(event) => {
								event.preventDefault();
								handleSearch();
							}}
						>
							<SearchField className="flex-1" onChange={setSearchText} value={searchText}>
								<SearchInput autoFocus={true} placeholder={inputPlaceholder ?? t("Search")} />
							</SearchField>
							<Button intent="outline" isDisabled={isPending} type="submit">
								{t("Search")}
							</Button>
						</form>

						{loadError != null ? (
							<p className="py-3 text-center text-danger-subtle-fg text-sm">{loadErrorMessage}</p>
						) : displayedItems.length > 0 ? (
							<div className="relative">
								<ListBox
									aria-label={ariaLabel}
									className={isPending ? "opacity-50" : undefined}
									items={displayedItems}
									onAction={(key) => {
										const item = displayedItems.find((entry) => {
											return entry.id === key;
										});

										if (item == null) {
											return;
										}

										onSelect(item);
										setIsOpen(false);
									}}
									selectedKeys={selectedItem != null ? new Set([selectedItem.id]) : new Set()}
									selectionMode="single"
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
