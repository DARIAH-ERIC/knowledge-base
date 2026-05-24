"use client";

import { isActionStateError } from "@dariah-eric/next-lib/actions";
import { Badge } from "@dariah-eric/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, useOptimistic, useState, useTransition } from "react";

import {
	EntityDeleteModal,
	EntityListHeader,
	EntityListPagination,
	EntityListSearchField,
	NewLink,
	RowActionsMenu,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { deleteContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/contributions/_lib/delete-contribution.action";
import { dashboardPageSize } from "@/config/pagination.config";
import type { ContributionsResult } from "@/lib/data/contributions";
import { useRouter } from "@/lib/navigation/navigation";

interface ContributionsPageProps {
	contributions: ContributionsResult;
	dir: "asc" | "desc";
	page: number;
	q: string;
	sort:
		| "personName"
		| "roleType"
		| "organisationalUnitType"
		| "organisationalUnitName"
		| "durationStart"
		| "durationEnd";
}

function formatRoleType(type: string): string {
	return type.replaceAll("_", " ");
}

function formatOrganisationalUnitType(type: string): string {
	return type.replaceAll("_", " ");
}

function organisationalUnitTypeIntent(
	type: string,
): "amber" | "danger" | "emerald" | "info" | "pink" | "rose" | "secondary" | "slate" | "violet" {
	switch (type) {
		case "country": {
			return "info";
		}
		case "eric": {
			return "rose";
		}
		case "governance_body": {
			return "slate";
		}
		case "institution": {
			return "emerald";
		}
		case "national_consortium": {
			return "amber";
		}
		case "regional_hub": {
			return "violet";
		}
		case "working_group": {
			return "pink";
		}
		default: {
			return "secondary";
		}
	}
}

function getOrganisationalUnitEditHref(type: string, slug: string): string | null {
	switch (type) {
		case "country": {
			return `/dashboard/administrator/countries/${slug}/edit`;
		}
		case "governance_body": {
			return `/dashboard/administrator/governance-bodies/${slug}/edit`;
		}
		case "institution": {
			return `/dashboard/administrator/institutions/${slug}/edit`;
		}
		case "national_consortium": {
			return `/dashboard/administrator/national-consortia/${slug}/edit`;
		}
		case "working_group": {
			return `/dashboard/administrator/working-groups/${slug}/edit`;
		}
		default: {
			return null;
		}
	}
}

const pageSize = dashboardPageSize;

export function ContributionsPage(props: Readonly<ContributionsPageProps>): ReactNode {
	const {
		contributions,
		dir: initialDir,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	} = props;

	const t = useExtracted();
	const format = useFormatter();
	const router = useRouter();
	const [items, optimisticallyRemoveItem] = useOptimistic(contributions.data, (state, id: string) =>
		state.filter((item) => item.id !== id),
	);
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const search = useUrlPaginatedSearch({
		dir: initialDir,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	});
	const [isDeletePending, startDeleteTransition] = useTransition();

	return (
		<Fragment>
			<EntityListHeader
				title={t("Person relations")}
				description={t("All person-to-organisation relations in the DARIAH knowledge base.")}
				action={
					<>
						<EntityListSearchField search={search} />
						<NewLink href="/dashboard/administrator/person-relations/create">{t("New")}</NewLink>
					</>
				}
			/>

			<Table
				aria-label="contributions"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={search.setSortDescriptor}
				sortDescriptor={search.sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="personName" isRowHeader={true}>
						{t("Person")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="roleType">
						{t("Role")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="organisationalUnitType">
						{t("Type")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="organisationalUnitName">
						{t("Name")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="durationStart">
						{t("From")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="durationEnd">
						{t("Until")}
					</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						const organisationalUnitEditHref = getOrganisationalUnitEditHref(
							item.organisationalUnitType,
							item.organisationalUnitSlug,
						);

						return (
							<TableRow id={item.id}>
								<TableCell>{item.personName}</TableCell>
								<TableCell>{formatRoleType(item.roleType)}</TableCell>
								<TableCell>
									<Badge intent={organisationalUnitTypeIntent(item.organisationalUnitType)}>
										{formatOrganisationalUnitType(item.organisationalUnitType)}
									</Badge>
								</TableCell>
								<TableCell>{item.organisationalUnitName}</TableCell>
								<TableCell>{format.dateTime(item.durationStart, { dateStyle: "short" })}</TableCell>
								<TableCell>
									{item.durationEnd != null
										? format.dateTime(item.durationEnd, { dateStyle: "short" })
										: t("present")}
								</TableCell>
								<TableCell className="text-end">
									<RowActionsMenu>
										<RowActionsMenu.Link
											href={`/dashboard/administrator/persons/${item.personSlug}/edit`}
											icon={<PencilSquareIcon className="me-2 block-4 inline-4" />}
										>
											{t("Edit person")}
										</RowActionsMenu.Link>
										{organisationalUnitEditHref != null ? (
											<RowActionsMenu.Link
												href={organisationalUnitEditHref}
												icon={<PencilSquareIcon className="me-2 block-4 inline-4" />}
											>
												{t("Edit organisation")}
											</RowActionsMenu.Link>
										) : null}
										<RowActionsMenu.Separator />
										<RowActionsMenu.Action
											danger={true}
											icon={<TrashIcon className="me-2 block-4 inline-4" />}
											onAction={() => {
												setItemToDelete({ id: item.id });
											}}
										>
											{t("Delete")}
										</RowActionsMenu.Action>
									</RowActionsMenu>
								</TableCell>
							</TableRow>
						);
					}}
				</TableBody>
			</Table>

			<EntityListPagination search={search} total={contributions.total} pageSize={pageSize} />

			<EntityDeleteModal
				item={itemToDelete}
				model={t("person relation")}
				isPending={isDeletePending}
				error={deleteError}
				onClose={() => {
					setItemToDelete(null);
					setDeleteError(null);
				}}
				onConfirm={() => {
					if (itemToDelete == null) {
						return;
					}

					const id = itemToDelete.id;
					setDeleteError(null);

					startDeleteTransition(async () => {
						optimisticallyRemoveItem(id);
						try {
							const state = await deleteContributionAction(id);
							if (isActionStateError(state)) {
								const message = Array.isArray(state.message) ? state.message[0] : state.message;
								setDeleteError(message ?? t("Could not delete person relation. Please try again."));
								return;
							}
							router.refresh();
							setItemToDelete(null);
						} catch {
							setDeleteError(t("Could not delete person relation. Please try again."));
						}
					});
				}}
			/>
		</Fragment>
	);
}
