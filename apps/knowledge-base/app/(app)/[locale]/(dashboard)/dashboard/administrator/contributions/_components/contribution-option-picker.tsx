"use client";

import { Button } from "@dariah-eric/ui/button";
import { fieldErrorStyles, fieldStyles, Label } from "@dariah-eric/ui/field";
import { ListBox, ListBoxItem } from "@dariah-eric/ui/list-box";
import { Popover, PopoverContent } from "@dariah-eric/ui/popover";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
import { ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useExtracted } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";

import { contributionOptionsPageSize } from "@/lib/constants/contributions";

interface ContributionOptionPickerItem {
	id: string;
	name: string;
}

interface ContributionOptionPickerProps {
	label: string;
	placeholder: string;
	emptyMessage: string;
	resource: "organisational-units" | "persons" | "countries";
	selectedItem: ContributionOptionPickerItem | null;
	onSelect: (item: ContributionOptionPickerItem) => void;
	initialItems?: Array<ContributionOptionPickerItem>;
	initialTotal?: number;
	roleTypeId?: string | null;
	isDisabled?: boolean;
	errorMessage?: string;
}

export function ContributionOptionPicker(
	props: Readonly<ContributionOptionPickerProps>,
): ReactNode {
	const {
		label,
		placeholder,
		emptyMessage,
		resource,
		selectedItem,
		onSelect,
		initialItems = [],
		initialTotal = 0,
		roleTypeId,
		isDisabled = false,
		errorMessage,
	} = props;

	const t = useExtracted();

	const [isOpen, setIsOpen] = useState(false);
	const [searchText, setSearchText] = useState("");
	const [appliedQ, setAppliedQ] = useState("");
	const [offset, setOffset] = useState(0);
	const [displayedItems, setDisplayedItems] = useState(initialItems);
	const [total, setTotal] = useState(initialTotal);
	const [isPending, startTransition] = useTransition();

	const hasPrev = offset > 0;
	const hasNext = offset + displayedItems.length < total;

	async function fetchPage(nextOffset: number, q: string): Promise<void> {
		const params = new URLSearchParams({
			limit: String(contributionOptionsPageSize),
			resource,
		});

		if (q !== "") {
			params.set("q", q);
		}

		if (nextOffset > 0) {
			params.set("offset", String(nextOffset));
		}

		if (resource === "organisational-units" && roleTypeId != null && roleTypeId !== "") {
			params.set("roleTypeId", roleTypeId);
		}

		const response = await fetch(`/api/contributions/options?${params.toString()}`);

		if (!response.ok) {
			setDisplayedItems([]);
			setTotal(0);
			return;
		}

		const data = (await response.json()) as {
			items: Array<ContributionOptionPickerItem>;
			total: number;
		};

		setDisplayedItems(data.items);
		setTotal(data.total);
		setOffset(nextOffset);
		setAppliedQ(q);
	}

	function handleOpenChange(open: boolean) {
		setIsOpen(open);

		if (!open || isDisabled) {
			return;
		}

		if (displayedItems.length === 0) {
			startTransition(async () => {
				await fetchPage(0, appliedQ);
			});
		}
	}

	return (
		<div className={fieldStyles()}>
			<Label>{label}</Label>

			<Popover isOpen={isOpen} onOpenChange={handleOpenChange}>
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
						<div className="flex gap-2">
							<SearchField className="flex-1" onChange={setSearchText} value={searchText}>
								<SearchInput placeholder={t("Search")} />
							</SearchField>
							<Button
								intent="outline"
								onPress={() => {
									startTransition(async () => {
										await fetchPage(0, searchText.trim());
									});
								}}
								type="button"
							>
								{t("Search")}
							</Button>
						</div>

						{isPending ? (
							<div className="flex items-center justify-center py-6">
								<ProgressCircle aria-label={t("Loading...")} isIndeterminate={true} />
							</div>
						) : displayedItems.length > 0 ? (
							<ListBox
								aria-label={label}
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
									return <ListBoxItem id={item.id}>{item.name}</ListBoxItem>;
								}}
							</ListBox>
						) : (
							<p className="py-3 text-center text-muted-fg text-sm">{emptyMessage}</p>
						)}

						<div className="flex justify-between gap-2">
							<Button
								intent="outline"
								isDisabled={!hasPrev || isPending}
								onPress={() => {
									startTransition(async () => {
										await fetchPage(offset - contributionOptionsPageSize, appliedQ);
									});
								}}
								type="button"
							>
								{t("Previous")}
							</Button>
							<Button
								intent="outline"
								isDisabled={!hasNext || isPending}
								onPress={() => {
									startTransition(async () => {
										await fetchPage(offset + contributionOptionsPageSize, appliedQ);
									});
								}}
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
