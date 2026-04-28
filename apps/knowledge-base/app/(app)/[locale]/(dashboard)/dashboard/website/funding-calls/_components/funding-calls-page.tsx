"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Button, buttonStyles } from "@dariah-eric/ui/button";
import { Link } from "@dariah-eric/ui/link";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "@dariah-eric/ui/menu";
import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import {
	EllipsisHorizontalIcon,
	EyeIcon,
	PencilSquareIcon,
	PlusIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, useOptimistic, useState, useTransition } from "react";

import { DeleteModal } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/delete-modal";
import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { deleteFundingCallAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/delete-funding-call.action";
import { useRouter } from "@/lib/navigation/navigation";

interface FundingCallsPageProps {
	dir: "asc" | "desc";
	fundingCalls: {
		data: Array<
			Pick<schema.FundingCall, "id" | "duration" | "title" | "summary"> & {
				entity: Pick<schema.Entity, "slug">;
				updatedAt: schema.Entity["updatedAt"];
			}
		>;
		total: number;
	};
	page: number;
	q: string;
	sort: "title" | "updatedAt";
}

const pageSize = 10;

export function FundingCallsPage(props: Readonly<FundingCallsPageProps>): ReactNode {
	const {
		dir: initialDir,
		fundingCalls,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	} = props;

	const t = useExtracted();
	const format = useFormatter();
	const router = useRouter();
	const [items, optimisticallyRemoveItem] = useOptimistic(
		fundingCalls.data,
		(state, id: string) => {
			return state.filter((item) => {
				return item.id !== id;
			});
		},
	);
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
	const { inputValue, isPending, page, setInputValue, setPage, setSortDescriptor, sortDescriptor } =
		useUrlPaginatedSearch({
			dir: initialDir,
			page: initialPage,
			q: initialQ,
			sort: initialSort,
		});
	const [isDeletePending, startDeleteTransition] = useTransition();

	const totalPages = Math.max(Math.ceil(fundingCalls.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Funding Calls")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all funding calls in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/website/funding-calls/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="funding calls"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={setSortDescriptor}
				sortDescriptor={sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="title" isRowHeader={true}>
						{t("Title")}
					</TableColumn>
					<TableColumn>{t("Duration")}</TableColumn>
					<TableColumn allowsSorting={true} id="updatedAt">
						{t("Updated")}
					</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow href={`/dashboard/website/funding-calls/${item.entity.slug}/details`}>
								<TableCell>
									<div className="max-w-64 truncate">{item.title}</div>
								</TableCell>
								<TableCell>
									{item.duration.end != null
										? format.dateTimeRange(item.duration.start, item.duration.end, {
												dateStyle: "short",
											})
										: format.dateTime(item.duration.start, { dateStyle: "short" })}
								</TableCell>
								<TableCell>{format.dateTime(item.updatedAt, { dateStyle: "short" })}</TableCell>
								<TableCell className="text-end">
									<Menu>
										<Button
											aria-label={t("Open actions menu")}
											className="h-7 sm:h-7"
											intent="plain"
											size="sq-sm"
										>
											<EllipsisHorizontalIcon className="size-5" />
										</Button>
										<MenuContent placement="left top">
											<MenuItem
												href={`/dashboard/website/funding-calls/${item.entity.slug}/details`}
											>
												<EyeIcon className="mr-2 size-4" />
												<MenuLabel>{t("View")}</MenuLabel>
											</MenuItem>
											<MenuItem href={`/dashboard/website/funding-calls/${item.entity.slug}/edit`}>
												<PencilSquareIcon className="mr-2 size-4" />
												<MenuLabel>{t("Edit")}</MenuLabel>
											</MenuItem>
											<MenuSeparator />
											<MenuItem
												intent="danger"
												onAction={() => {
													setItemToDelete({ id: item.id });
												}}
											>
												<TrashIcon className="mr-2 size-4" />
												<MenuLabel>{t("Delete")}</MenuLabel>
											</MenuItem>
										</MenuContent>
									</Menu>
								</TableCell>
							</TableRow>
						);
					}}
				</TableBody>
			</Table>

			<Paginate
				isPending={isPending}
				page={page}
				setPage={setPage}
				total={totalPages}
				totalItems={fundingCalls.total}
			/>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("FundingCall")}
				onAction={() => {
					if (itemToDelete == null) {
						return;
					}

					const id = itemToDelete.id;

					startDeleteTransition(async () => {
						optimisticallyRemoveItem(id);
						await deleteFundingCallAction(id);
						router.refresh();
						setItemToDelete(null);
					});
				}}
				onOpenChange={(open) => {
					if (!open && !isDeletePending) {
						setItemToDelete(null);
					}
				}}
			/>
		</Fragment>
	);
}
