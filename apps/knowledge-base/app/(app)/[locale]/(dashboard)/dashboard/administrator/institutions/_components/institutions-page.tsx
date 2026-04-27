"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Badge } from "@dariah-eric/ui/badge";
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
import { deleteInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/delete-institution.action";
import type { InstitutionEricRelationStatus } from "@/lib/data/institutions";
import { useRouter } from "@/lib/navigation/navigation";

interface InstitutionsPageProps {
	institutions: {
		data: Array<
			Pick<schema.OrganisationalUnit, "id" | "name"> & {
				countryName: string | null;
				ericRelationStatuses: Array<InstitutionEricRelationStatus>;
				entity: Pick<schema.Entity, "slug">;
			}
		>;
		total: number;
	};
	dir: "asc" | "desc";
	page: number;
	q: string;
	sort: "name" | "country" | "status";
}

function institutionStatusIntent(
	status: InstitutionEricRelationStatus,
): "danger" | "info" | "primary" | "success" {
	switch (status) {
		case "is_partner_institution_of": {
			return "primary";
		}
		case "is_cooperating_partner_of": {
			return "danger";
		}
		case "is_national_coordinating_institution_in": {
			return "info";
		}
		case "is_national_representative_institution_in": {
			return "success";
		}
	}
}

const pageSize = 10;

export function InstitutionsPage(props: Readonly<InstitutionsPageProps>): ReactNode {
	const {
		dir: initialDir,
		institutions,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	} = props;

	const t = useExtracted();
	const router = useRouter();
	const institutionStatusLabels: Record<InstitutionEricRelationStatus, string> = {
		is_cooperating_partner_of: t("Cooperating partner"),
		is_national_coordinating_institution_in: t("National coordinating institution"),
		is_national_representative_institution_in: t("National representative institution"),
		is_partner_institution_of: t("Partner institution"),
	};
	const [items, optimisticallyRemoveItem] = useOptimistic(
		institutions.data,
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

	const totalPages = Math.max(Math.ceil(institutions.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Institutions")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all institutions in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/institutions/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="institutions"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={setSortDescriptor}
				sortDescriptor={sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="name" isRowHeader={true}>
						{t("Name")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="country">
						{t("Country")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="status">
						{t("Status")}
					</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow>
								<TableCell>{item.name}</TableCell>
								<TableCell>{item.countryName ?? "—"}</TableCell>
								<TableCell>
									{item.ericRelationStatuses.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{item.ericRelationStatuses.map((status) => {
												return (
													<Badge key={status} intent={institutionStatusIntent(status)}>
														{institutionStatusLabels[status]}
													</Badge>
												);
											})}
										</div>
									) : (
										"—"
									)}
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
												href={`/dashboard/administrator/institutions/${item.entity.slug}/edit`}
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
				totalItems={institutions.total}
			/>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("institution")}
				onAction={() => {
					if (itemToDelete == null) {
						return;
					}

					const id = itemToDelete.id;

					startDeleteTransition(async () => {
						optimisticallyRemoveItem(id);
						await deleteInstitutionAction(id);
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
