import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { assertAdminPageAccess } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorReportingStatisticsPageProps
	extends PageProps<"/[locale]/dashboard/administrator/reporting-statistics"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorReportingStatisticsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Reporting statistics"),
	});

	return metadata;
}

export default async function DashboardAdministratorReportingStatisticsPage(
	_props: Readonly<DashboardAdministratorReportingStatisticsPageProps>,
): Promise<ReactNode> {
	await assertAdminPageAccess();

	const t = await getExtracted();

	return (
		<div className="flex flex-col gap-y-8">
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Statistics")}</HeaderTitle>
					<HeaderDescription>
						{t("Reporting statistics and aggregated metrics will appear here.")}
					</HeaderDescription>
				</HeaderContent>
			</Header>

			<div className="px-(--layout-padding)">
				<section className="rounded-lg border bg-bg p-6">
					<p className="text-sm text-muted-fg italic">{t("Coming soon.")}</p>
				</section>
			</div>
		</div>
	);
}
