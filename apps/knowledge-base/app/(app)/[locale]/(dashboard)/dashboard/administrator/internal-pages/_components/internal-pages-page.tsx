"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Button } from "@dariah-eric/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@dariah-eric/ui/menu";
import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { EllipsisHorizontalIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode } from "react";

import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { dashboardPageSize } from "@/config/pagination.config";

interface InternalPagesPageProps {
	dir: "asc" | "desc";
	internalPages: {
		data: Array<
			Pick<schema.InternalPage, "id" | "title"> & {
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

const pageSize = dashboardPageSize;

export function InternalPagesPage(props: Readonly<InternalPagesPageProps>): ReactNode {
	const {
		dir: initialDir,
		internalPages,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	} = props;

	const t = useExtracted();
	const format = useFormatter();
	const { inputValue, isPending, page, setInputValue, setPage, setSortDescriptor, sortDescriptor } =
		useUrlPaginatedSearch({
			dir: initialDir,
			page: initialPage,
			q: initialQ,
			sort: initialSort,
		});

	const totalPages = Math.max(Math.ceil(internalPages.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Internal pages")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage internal knowledge base pages such as legal pages.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
				</HeaderAction>
			</Header>

			<Table
				aria-label="internal-pages"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={setSortDescriptor}
				sortDescriptor={sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="title" isRowHeader={true}>
						{t("Title")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="updatedAt">
						{t("Updated")}
					</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={internalPages.data}>
					{(item) => (
						<TableRow href={`/dashboard/administrator/internal-pages/${item.entity.slug}/edit`}>
							<TableCell>
								<div className="max-inline-64 truncate">{item.title}</div>
							</TableCell>
							<TableCell>{format.dateTime(item.updatedAt, { dateStyle: "short" })}</TableCell>
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
											href={`/dashboard/administrator/internal-pages/${item.entity.slug}/edit`}
										>
											<PencilSquareIcon className="me-2 block-4 inline-4" />
											<MenuLabel>{t("Edit")}</MenuLabel>
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
				totalItems={internalPages.total}
			/>
		</Fragment>
	);
}
