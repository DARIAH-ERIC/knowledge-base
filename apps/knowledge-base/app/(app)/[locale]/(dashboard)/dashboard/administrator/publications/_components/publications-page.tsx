"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import {
	EntityListHeader,
	EntityListPagination,
	EntityListSearchField,
	NewLink,
	RowActionsMenu,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { dashboardPageSize } from "@/config/pagination.config";

interface PublicationsPageProps {
	dir: "asc" | "desc";
	page: number;
	q: string;
	sort: "title" | "publicationYear" | "status";
	publications: {
		data: Array<
			Pick<schema.Publication, "id" | "title" | "type" | "status" | "publicationYear" | "doi">
		>;
		total: number;
	};
}

function label(value: string): string {
	return value.replaceAll("_", " ");
}

export function PublicationsPage(props: Readonly<PublicationsPageProps>): ReactNode {
	const t = useExtracted();
	const search = useUrlPaginatedSearch({
		dir: props.dir,
		page: props.page,
		q: props.q,
		sort: props.sort,
	});
	return (
		<Fragment>
			<EntityListHeader
				title={t("Publications")}
				description={t(
					"Manage bibliographic records and their explicit organisational-unit relations.",
				)}
				action={
					<>
						<EntityListSearchField search={search} />
						<NewLink href="/dashboard/administrator/publications/create">{t("New")}</NewLink>
					</>
				}
			/>
			<Table
				aria-label={t("Publications")}
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={search.setSortDescriptor}
				sortDescriptor={search.sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="title" isRowHeader={true}>
						{t("Title")}
					</TableColumn>
					<TableColumn>{t("Type")}</TableColumn>
					<TableColumn allowsSorting={true} id="publicationYear">
						{t("Year")}
					</TableColumn>
					<TableColumn>{t("DOI")}</TableColumn>
					<TableColumn allowsSorting={true} id="status">
						{t("Status")}
					</TableColumn>
					<TableColumn className="text-end" />
				</TableHeader>
				<TableBody items={props.publications.data}>
					{(item) => (
						<TableRow id={item.id} href={`/dashboard/administrator/publications/${item.id}/edit`}>
							<TableCell>
								<div className="max-inline-96 truncate">{item.title}</div>
							</TableCell>
							<TableCell>{label(item.type)}</TableCell>
							<TableCell>{item.publicationYear ?? "—"}</TableCell>
							<TableCell>{item.doi ?? "—"}</TableCell>
							<TableCell>{label(item.status)}</TableCell>
							<TableCell className="text-end">
								<RowActionsMenu>
									<RowActionsMenu.Link
										href={`/dashboard/administrator/publications/${item.id}/edit`}
										icon={<PencilSquareIcon className="me-2 block-4 inline-4" />}
									>
										{t("Edit")}
									</RowActionsMenu.Link>
								</RowActionsMenu>
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
			<EntityListPagination
				search={search}
				total={props.publications.total}
				pageSize={dashboardPageSize}
			/>
		</Fragment>
	);
}
