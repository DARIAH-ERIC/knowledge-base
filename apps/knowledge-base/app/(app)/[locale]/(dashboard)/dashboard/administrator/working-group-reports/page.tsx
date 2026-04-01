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

interface DashboardAdministratorWorkingGroupReportsPageProps extends PageProps<"/[locale]/dashboard/administrator/working-group-reports"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorWorkingGroupReportsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Working group reports"),
	});

	return metadata;
}

export default function DashboardAdministratorWorkingGroupReportsPage(
	_props: Readonly<DashboardAdministratorWorkingGroupReportsPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Working group reports")}</HeaderTitle>
				<HeaderDescription>
					{t("Manage all working group reports in the DARIAH knowledge base.")}
				</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
