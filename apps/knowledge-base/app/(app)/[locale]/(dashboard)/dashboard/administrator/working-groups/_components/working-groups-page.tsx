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
	PencilSquareIcon,
	PlusIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, useState, useTransition } from "react";

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
import { deleteWorkingGroupAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/delete-working-group.action";
import { useRouter } from "@/lib/navigation/navigation";

interface WorkingGroupsPageProps {
	page: number;
	q: string;
	workingGroups: {
		data: Array<
			Pick<schema.OrganisationalUnit, "id" | "name"> & {
				durationFrom: Date | null;
				durationUntil: Date | null;
				entity: Pick<schema.Entity, "slug">;
			}
		>;
		total: number;
	};
}

const pageSize = 10;

export function WorkingGroupsPage(props: Readonly<WorkingGroupsPageProps>): ReactNode {
	const { page: initialPage, q: initialQ, workingGroups } = props;

	const t = useExtracted();
	const format = useFormatter();
	const router = useRouter();
	const [items, setItems] = useState(() => {
		return workingGroups.data;
	});
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
	const { inputValue, isPending, page, setInputValue, setPage } = useUrlPaginatedSearch({
		page: initialPage,
		q: initialQ,
	});
	const [isDeletePending, startDeleteTransition] = useTransition();

	const totalPages = Math.max(Math.ceil(workingGroups.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Working groups")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all working groups in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/working-groups/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="working groups"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Name")}</TableColumn>
					<TableColumn>{t("From")}</TableColumn>
					<TableColumn>{t("Until")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow>
								<TableCell>{item.name}</TableCell>
								<TableCell>
									{item.durationFrom != null
										? format.dateTime(item.durationFrom, { dateStyle: "short" })
										: "—"}
								</TableCell>
								<TableCell>
									{item.durationFrom == null
										? "—"
										: item.durationUntil != null
											? format.dateTime(item.durationUntil, { dateStyle: "short" })
											: t("present")}
								</TableCell>
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
												href={`/dashboard/administrator/working-groups/${item.entity.slug}/edit`}
											>
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
				totalItems={workingGroups.total}
			/>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("working group")}
				onAction={() => {
					if (itemToDelete == null) {
						return;
					}

					const id = itemToDelete.id;

					startDeleteTransition(async () => {
						setItems((prev) => {
							return prev.filter((item) => {
								return item.id !== id;
							});
						});
						await deleteWorkingGroupAction(id);
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
