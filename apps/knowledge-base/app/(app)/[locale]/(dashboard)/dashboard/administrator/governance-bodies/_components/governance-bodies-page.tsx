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
import { deleteGovernanceBodyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_lib/delete-governance-body.action";
import { useRouter } from "@/lib/navigation/navigation";

interface GovernanceBodiesPageProps {
	dir: "asc" | "desc";
	governanceBodies: {
		data: Array<
			Pick<schema.OrganisationalUnit, "acronym" | "id" | "name"> & {
				entity: Pick<schema.Entity, "slug">;
			}
		>;
		total: number;
	};
	page: number;
	q: string;
	sort: "acronym" | "name";
}

const pageSize = 10;

export function GovernanceBodiesPage(props: Readonly<GovernanceBodiesPageProps>): ReactNode {
	const {
		dir: initialDir,
		governanceBodies,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	} = props;

	const t = useExtracted();
	const router = useRouter();
	const [items, setItems] = useState(() => {
		return governanceBodies.data;
	});
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
	const { inputValue, isPending, page, setInputValue, setPage, setSortDescriptor, sortDescriptor } =
		useUrlPaginatedSearch({
			dir: initialDir,
			page: initialPage,
			q: initialQ,
			sort: initialSort,
		});
	const [isDeletePending, startDeleteTransition] = useTransition();

	const totalPages = Math.max(Math.ceil(governanceBodies.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Governance bodies")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all governance bodies in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/governance-bodies/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="governance bodies"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={setSortDescriptor}
				sortDescriptor={sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="acronym" isRowHeader={true}>
						{t("Acronym")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="name">
						{t("Name")}
					</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow>
								<TableCell className="uppercase">{item.acronym}</TableCell>
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
												href={`/dashboard/administrator/governance-bodies/${item.entity.slug}/edit`}
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
				totalItems={governanceBodies.total}
			/>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("governance body")}
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
						await deleteGovernanceBodyAction(id);
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
