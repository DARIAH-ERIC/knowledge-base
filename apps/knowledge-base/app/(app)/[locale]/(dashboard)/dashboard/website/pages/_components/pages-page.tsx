"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Button } from "@dariah-eric/ui/button";
import { buttonStyles } from "@dariah-eric/ui/button-styles";
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
import { deletePageItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_lib/delete-page-item.action";
import { dashboardPageSize } from "@/config/pagination.config";
import { useRouter } from "@/lib/navigation/navigation";

interface PagesPageProps {
	dir: "asc" | "desc";
	page: number;
	pages: {
		data: Array<
			Pick<schema.Page, "id" | "title" | "summary"> & {
				documentId: string;
				entity: Pick<schema.Entity, "slug">;
				hasDraft: boolean;
				isPublished: boolean;
				updatedAt: schema.Entity["updatedAt"];
			}
		>;
		total: number;
	};
	q: string;
	sort: "title" | "updatedAt";
}

const pageSize = dashboardPageSize;

export function PagesPage(props: Readonly<PagesPageProps>): ReactNode {
	const { dir: initialDir, page: initialPage, pages, q: initialQ, sort: initialSort } = props;

	const t = useExtracted();
	const format = useFormatter();
	const router = useRouter();
	const [items, optimisticallyRemoveItem] = useOptimistic(pages.data, (state, id: string) =>
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

	const totalPages = Math.max(Math.ceil(pages.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Pages")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all pages in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/website/pages/create"
					>
						<PlusIcon className="me-2 block-4 inline-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="pages"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={setSortDescriptor}
				sortDescriptor={sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="title" isRowHeader={true}>
						{t("Title")}
					</TableColumn>
					<TableColumn>{t("Summary")}</TableColumn>
					<TableColumn allowsSorting={true} id="updatedAt">
						{t("Updated")}
					</TableColumn>
					<TableColumn>{t("Status")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => (
						<TableRow href={`/dashboard/website/pages/${item.entity.slug}/details`}>
							<TableCell>
								<div className="max-inline-96 truncate">{item.title}</div>
							</TableCell>
							<TableCell>
								<div className="max-inline-xs truncate">{item.summary}</div>
							</TableCell>
							<TableCell>{format.dateTime(item.updatedAt, { dateStyle: "short" })}</TableCell>
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
										<MenuItem href={`/dashboard/website/pages/${item.entity.slug}/details`}>
											<EyeIcon className="me-2 block-4 inline-4" />
											<MenuLabel>{t("View")}</MenuLabel>
										</MenuItem>
										<MenuItem href={`/dashboard/website/pages/${item.entity.slug}/edit`}>
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
				totalItems={pages.total}
			/>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("page")}
				onAction={() => {
					if (itemToDelete == null) {
						return;
					}

					const { id, documentId } = itemToDelete;
					startDeleteTransition(async () => {
						optimisticallyRemoveItem(id);
						await deletePageItemAction(documentId);
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
