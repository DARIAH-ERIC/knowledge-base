import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ReportingRemovedServicesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-statistics/_components/reporting-removed-services-page";
import { ReportingStatisticsShell } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-statistics/_components/reporting-statistics-shell";
import { getStatisticsFilters } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-statistics/_lib/statistics-filters";
import { dashboardPageSize } from "@/config/pagination.config";
import { assertAdminPageAccess } from "@/lib/auth/session";
import {
	type ReportingRemovedServicesSort,
	getReportingRemovedServicesForAdmin,
	getReportingStatisticsFilterOptionsForAdmin,
} from "@/lib/data/admin-reporting";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams, getListSortSearchParams } from "@/lib/server/list-search-params";

interface DashboardAdministratorReportingStatisticsRemovedServicesPageProps extends PageProps<"/[locale]/dashboard/administrator/reporting-statistics/removed-services"> {}

const pageSize = dashboardPageSize;
const defaultSort = "campaignYear" satisfies ReportingRemovedServicesSort;
const validSorts = [
	"campaignYear",
	"country",
	"service",
] satisfies ReadonlyArray<ReportingRemovedServicesSort>;

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorReportingStatisticsRemovedServicesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Removed services"),
	});

	return metadata;
}

export default async function DashboardAdministratorReportingStatisticsRemovedServicesPage(
	props: Readonly<DashboardAdministratorReportingStatisticsRemovedServicesPageProps>,
): Promise<ReactNode> {
	const { searchParams } = props;
	const rawSearchParams = await searchParams;
	const { page, q } = getListSearchParams(rawSearchParams);
	const { dir, sort } = getListSortSearchParams(rawSearchParams, {
		defaultDir: "desc",
		defaultSort,
		validSorts,
	});
	const { user } = await assertAdminPageAccess();
	const [filterOptions, removedServices] = await Promise.all([
		getReportingStatisticsFilterOptionsForAdmin(user),
		getReportingRemovedServicesForAdmin(user, {
			...getStatisticsFilters(rawSearchParams),
			dir,
			limit: pageSize,
			offset: (page - 1) * pageSize,
			q,
			sort,
		}),
	]);

	return (
		<ReportingStatisticsShell filterOptions={filterOptions}>
			<ReportingRemovedServicesPage
				dir={dir}
				page={page}
				q={q}
				removedServices={removedServices}
				sort={sort}
			/>
		</ReportingStatisticsShell>
	);
}
