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
import { Fragment, type ReactNode, useOptimistic, useState, useTransition } from "react";

import { DeleteModal } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/delete-modal";
import { EntityLifecycleStatusBadge } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-status-badge";
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
import { dashboardPageSize } from "@/config/pagination.config";
import { useRouter } from "@/lib/navigation/navigation";

interface WorkingGroupsPageProps {
	dir: "asc" | "desc";
	page: number;
	q: string;
	sort: "name";
	workingGroups: {
		data: Array<
			Pick<schema.OrganisationalUnit, "acronym" | "id" | "name"> & {
				documentId: string;
				durationFrom: Date | null;
				durationUntil: Date | null;
				entity: Pick<schema.Entity, "slug">;
				hasDraft: boolean;
				isPublished: boolean;
			}
		>;
		total: number;
	};
}

const pageSize = dashboardPageSize;

export function WorkingGroupsPage(props: Readonly<WorkingGroupsPageProps>): ReactNode {
	const {
		dir: initialDir,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
		workingGroups,
	} = props;

	const t = useExtracted();
	const format = useFormatter();
	const router = useRouter();
	const [items, optimisticallyRemoveItem] = useOptimistic(workingGroups.data, (state, id: string) =>
		state.filter((item) => item.id !== id),
	);
	const [itemToDelete, setItemToDelete] = useState<{ id: string; documentId: string } | null>(null);
	const { inputValue, isPending, page, setInputValue, setPage, setSortDescriptor, sortDescriptor } =
		useUrlPaginatedSearch({
			dir: initialDir,
			page: initialPage,
			q: initialQ,
			sort: initialSort,
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
						<PlusIcon className="me-2 block-4 inline-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="working groups"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={setSortDescriptor}
				sortDescriptor={sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="name" isRowHeader={true}>
						{t("Name")}
					</TableColumn>
					<TableColumn>{t("Acronym")}</TableColumn>
					<TableColumn>{t("From")}</TableColumn>
					<TableColumn>{t("Until")}</TableColumn>
					<TableColumn>{t("Status")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => (
						<TableRow>
							<TableCell>{item.name}</TableCell>
							<TableCell>{item.acronym}</TableCell>
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
							<TableCell>
								<EntityLifecycleStatusBadge
									hasDraft={item.hasDraft}
									isPublished={item.isPublished}
								/>
							</TableCell>
							<TableCell className="text-end">
								<Menu>
									<Button
										aria-label={t("Open actions menu")}
										className="block-7 sm:block-7"
										intent="plain"
										size="sq-sm"
									>
										<EllipsisHorizontalIcon className="block-5 inline-5" />
									</Button>
									<MenuContent placement="left top">
										<MenuItem
											href={`/dashboard/administrator/working-groups/${item.entity.slug}/edit`}
										>
											<PencilSquareIcon className="me-2 block-4 inline-4" />
											<MenuLabel>{t("Edit")}</MenuLabel>
										</MenuItem>
										<MenuSeparator />
										<MenuItem
											intent="danger"
											onAction={() => {
												setItemToDelete({ id: item.id, documentId: item.documentId });
											}}
										>
											<TrashIcon className="me-2 block-4 inline-4" />
											<MenuLabel>{t("Delete")}</MenuLabel>
										</MenuItem>
									</MenuContent>
								</Menu>
							</TableCell>
						</TableRow>
					)}
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

					const { id, documentId } = itemToDelete;

					startDeleteTransition(async () => {
						optimisticallyRemoveItem(id);
						await deleteWorkingGroupAction(documentId);
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
