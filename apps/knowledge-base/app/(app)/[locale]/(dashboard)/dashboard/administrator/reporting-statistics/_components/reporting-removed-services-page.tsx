"use client";

import { Link } from "@dariah-eric/ui/link";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode } from "react";

import {
	EntityListPagination,
	EntityListSearchField,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { dashboardPageSize } from "@/config/pagination.config";
import type {
	ReportingRemovedServicesData,
	ReportingRemovedServicesSort,
} from "@/lib/data/admin-reporting";
import type { ListSortDirection } from "@/lib/server/list-search-params";

interface ReportingRemovedServicesPageProps {
	dir: ListSortDirection;
	page: number;
	q: string;
	removedServices: ReportingRemovedServicesData;
	sort: ReportingRemovedServicesSort;
}

const pageSize = dashboardPageSize;

/** Humanise snake_case enum values (`needs_review`, `to_be_discontinued`) — data, not UI copy. */
function formatEnum(value: string): string {
	const spaced = value.replaceAll("_", " ");

	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Services a country listed in one campaign year's report but no longer lists in the next year's.
 *
 * The campaign-year filter in the shared bar selects the year a service went missing; the report
 * status filter applies to that year's report.
 */
export function ReportingRemovedServicesPage(
	props: Readonly<ReportingRemovedServicesPageProps>,
): ReactNode {
	const { dir, page, q, removedServices, sort } = props;

	const t = useExtracted();
	const format = useFormatter();
	const search = useUrlPaginatedSearch({ dir, page, q, sort });

	return (
		<Fragment>
			<section className="flex flex-col gap-y-4">
				<div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
					<div className="flex flex-col gap-y-1">
						<h2 className="text-sm font-semibold text-fg">{t("Removed services")}</h2>
						<p className="text-sm text-muted-fg">
							{t(
								"See which services a country reported in the previous campaign year but no longer reports. Services that are no longer live are not carried over into new reports.",
							)}
						</p>
					</div>

					<EntityListSearchField search={search} placeholder={t("Search by service")} />
				</div>

				<div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-lg border bg-bg p-4">
					<p className="text-sm text-muted-fg">
						{t("{count} removed services", { count: format.number(removedServices.total) })}
					</p>
				</div>

				<Table
					aria-label="removed services"
					className="overflow-x-auto [--gutter:0] sm:[--gutter:0]"
					onSortChange={search.setSortDescriptor}
					sortDescriptor={search.sortDescriptor}
				>
					<TableHeader>
						<TableColumn allowsSorting={true} id="service" isRowHeader={true}>
							{t("Service")}
						</TableColumn>
						<TableColumn>{t("Type")}</TableColumn>
						<TableColumn>{t("Service status")}</TableColumn>
						<TableColumn allowsSorting={true} id="country">
							{t("Country")}
						</TableColumn>
						<TableColumn allowsSorting={true} id="campaignYear">
							{t("Removed in")}
						</TableColumn>
						<TableColumn>{t("Report status")}</TableColumn>
					</TableHeader>
					<TableBody items={removedServices.data}>
						{(item) => (
							<TableRow id={item.id}>
								<TableCell>
									<Link
										href={
											item.serviceIsInternal
												? `/dashboard/administrator/internal-services/${item.serviceId}/details`
												: `/dashboard/administrator/sshoc-services/${item.serviceId}/view`
										}
									>
										{item.serviceName}
									</Link>
								</TableCell>
								<TableCell>{formatEnum(item.serviceType)}</TableCell>
								<TableCell>{formatEnum(item.serviceStatus)}</TableCell>
								<TableCell>{item.countryName}</TableCell>
								<TableCell>
									{t("{previous} → {current}", {
										current: String(item.campaignYear),
										previous: String(item.campaignYear - 1),
									})}
								</TableCell>
								<TableCell>{formatEnum(item.status)}</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>

				{removedServices.data.length === 0 && (
					<p className="text-sm text-muted-fg">{t("No removed services were found.")}</p>
				)}
			</section>

			<EntityListPagination search={search} total={removedServices.total} pageSize={pageSize} />
		</Fragment>
	);
}
