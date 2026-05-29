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
import type { ProjectPartnersResult } from "@/lib/data/project-partners";

interface ProjectPartnersPageProps {
	projectPartners: ProjectPartnersResult;
	dir: "asc" | "desc";
	page: number;
	q: string;
	sort: "projectName" | "roleType" | "unitName" | "unitType" | "durationStart" | "durationEnd";
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

export function ProjectPartnersPage(props: Readonly<ProjectPartnersPageProps>): ReactNode {
	const {
		projectPartners,
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
				title={t("Project partners")}
				description={t(
					"Review project-to-organisation partner relations and manage them from project edit pages.",
				)}
				action={<EntityListSearchField search={search} />}
			/>

			<Table
				aria-label="project partners"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={search.setSortDescriptor}
				sortDescriptor={search.sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="projectName" isRowHeader={true}>
						{t("Project")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="roleType">
						{t("Role")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="unitType">
						{t("Type")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="unitName">
						{t("Partner")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="durationStart">
						{t("From")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="durationEnd">
						{t("Until")}
					</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={projectPartners.data}>
					{(item) => (
						<TableRow id={item.id}>
							<TableCell>
								<div className="max-inline-64 truncate">
									{item.projectAcronym ?? item.projectName}
								</div>
							</TableCell>
							<TableCell>{formatValue(item.roleType)}</TableCell>
							<TableCell>
								<Badge intent={organisationalUnitTypeIntent(item.unitType)}>
									{formatValue(item.unitType)}
								</Badge>
							</TableCell>
							<TableCell>{item.unitName}</TableCell>
							<TableCell>
								{item.durationStart != null
									? format.dateTime(item.durationStart, { dateStyle: "short" })
									: "—"}
							</TableCell>
							<TableCell>
								{item.durationEnd != null
									? format.dateTime(item.durationEnd, { dateStyle: "short" })
									: item.durationStart != null
										? t("present")
										: "—"}
							</TableCell>
							<TableCell className="text-end">
								<RowActionsMenu>
									<RowActionsMenu.Link
										href={`/dashboard/administrator/projects/${item.projectSlug}/edit`}
										icon={<PencilSquareIcon className="me-2 block-4 inline-4" />}
									>
										{t("Edit project")}
									</RowActionsMenu.Link>
								</RowActionsMenu>
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			<EntityListPagination search={search} total={projectPartners.total} pageSize={pageSize} />
		</Fragment>
	);
}
