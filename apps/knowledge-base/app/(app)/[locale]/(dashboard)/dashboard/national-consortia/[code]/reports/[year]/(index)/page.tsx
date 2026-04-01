import type { Metadata, ResolvingMetadata } from "next";
import { useExtracted } from "next-intl";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardNationalConsortiumReportPageProps extends PageProps<"/[locale]/dashboard/national-consortia/[code]/reports/[year]"> {}

export async function generateMetadata(
	_props: Readonly<DashboardNationalConsortiumReportPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("National consortium dashboard - Report"),
	});

	return metadata;
}

export default function DashboardNationalConsortiumReportPage(
	_props: Readonly<DashboardNationalConsortiumReportPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Report")}</HeaderTitle>
				<HeaderDescription>{t("Manage national consortium report.")}</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
