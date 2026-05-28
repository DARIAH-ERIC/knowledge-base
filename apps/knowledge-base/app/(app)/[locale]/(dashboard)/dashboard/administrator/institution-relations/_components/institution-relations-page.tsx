"use client";

import { Badge } from "@dariah-eric/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode } from "react";

import {
	EntityListHeader,
	EntityListPagination,
	EntityListSearchField,
	RowActionsMenu,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { dashboardPageSize } from "@/config/pagination.config";
import type { InstitutionRelationsResult } from "@/lib/data/institution-relations";

interface InstitutionRelationsPageProps {
	institutionRelations: InstitutionRelationsResult;
	dir: "asc" | "desc";
	page: number;
	q: string;
	sort:
		| "institutionName"
		| "statusType"
		| "relatedUnitName"
		| "relatedUnitType"
		| "durationStart"
		| "durationEnd";
}

function formatValue(value: string): string {
	return value.replaceAll("_", " ");
}

function organisationalUnitTypeIntent(
	type: string,
): "amber" | "emerald" | "info" | "pink" | "rose" | "secondary" | "slate" | "violet" {
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

const pageSize = dashboardPageSize;

export function InstitutionRelationsPage(
	props: Readonly<InstitutionRelationsPageProps>,
): ReactNode {
	const {
		institutionRelations,
		dir: initialDir,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	} = props;

	const t = useExtracted();
	const format = useFormatter();
	const search = useUrlPaginatedSearch({
		dir: initialDir,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	});

	return (
		<Fragment>
			<EntityListHeader
				title={t("Institution relations")}
				description={t(
					"Review dated institution-to-organisation relations and manage them from institution edit pages.",
				)}
				action={<EntityListSearchField search={search} />}
			/>

			<Table
				aria-label="institution relations"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={search.setSortDescriptor}
				sortDescriptor={search.sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="institutionName" isRowHeader={true}>
						{t("Institution")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="statusType">
						{t("Relation")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="relatedUnitType">
						{t("Type")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="relatedUnitName">
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
				<TableBody items={institutionRelations.data}>
					{(item) => (
						<TableRow id={item.id}>
							<TableCell>{item.institutionName}</TableCell>
							<TableCell>{formatValue(item.statusType)}</TableCell>
							<TableCell>
								<Badge intent={organisationalUnitTypeIntent(item.relatedUnitType)}>
									{formatValue(item.relatedUnitType)}
								</Badge>
							</TableCell>
							<TableCell>{item.relatedUnitName}</TableCell>
							<TableCell>{format.dateTime(item.durationStart, { dateStyle: "short" })}</TableCell>
							<TableCell>
								{item.durationEnd != null
									? format.dateTime(item.durationEnd, { dateStyle: "short" })
									: t("present")}
							</TableCell>
							<TableCell className="text-end">
								<RowActionsMenu>
									<RowActionsMenu.Link
										href={`/dashboard/administrator/institutions/${item.institutionSlug}/edit`}
										icon={<PencilSquareIcon className="me-2 block-4 inline-4" />}
									>
										{t("Edit institution")}
									</RowActionsMenu.Link>
								</RowActionsMenu>
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			<EntityListPagination
				search={search}
				total={institutionRelations.total}
				pageSize={pageSize}
			/>
		</Fragment>
	);
}
