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
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, startTransition, use, useState } from "react";
import { useFilter, useListData } from "react-aria-components";

import { DeleteModal } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/delete-modal";
import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { deleteNationalConsortiumAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/delete-national-consortium.action";

interface NationalConsortiaPageProps {
	nationalConsortia: Promise<
		Array<
			Pick<schema.OrganisationalUnit, "id" | "name"> & {
				entity: Pick<schema.Entity, "documentId" | "slug"> & {
					status: Pick<schema.EntityStatus, "id" | "type">;
				};
			}
		>
	>;
}

export function NationalConsortiaPage(props: Readonly<NationalConsortiaPageProps>): ReactNode {
	const { nationalConsortia: nationalConsortiaPromise } = props;

	const nationalConsortia = use(nationalConsortiaPromise);

	const t = useExtracted();

	const { contains } = useFilter({ sensitivity: "base" });

	const list = useListData({
		filter(item, filterText) {
			return contains(item.name, filterText);
		},
		initialItems: nationalConsortia,
	});

	const [page, setPage] = useState(1);

	const pageSize = 10;
	const pages = Math.ceil(list.items.length / pageSize);
	const items = list.items.slice((page - 1) * pageSize, page * pageSize);

	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("National consortia")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all national consortia in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField
						onChange={(value) => {
							list.setFilterText(value);
							setPage(1);
						}}
						value={list.filterText}
					>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/national-consortia/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="national consortia"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Name")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow>
								<TableCell>{item.name}</TableCell>
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
												href={`/dashboard/administrator/national-consortia/${item.entity.slug}/edit`}
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

			<Paginate page={page} setPage={setPage} total={pages} />

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("national consortium")}
				onAction={() => {
					if (itemToDelete == null) {
						return;
					}

					startTransition(async () => {
						await deleteNationalConsortiumAction(itemToDelete.id);
						list.remove(itemToDelete.id);
						setItemToDelete(null);
					});
				}}
				onOpenChange={(open) => {
					if (!open) {
						setItemToDelete(null);
					}
				}}
			/>
		</Fragment>
	);
}
