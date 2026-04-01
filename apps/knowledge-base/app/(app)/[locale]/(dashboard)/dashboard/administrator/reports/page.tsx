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

interface DashboardAdministratorReportsPageProps extends PageProps<"/[locale]/dashboard/administrator/reports"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorReportsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Reports"),
	});

	return metadata;
}

export default function DashboardAdministratorReportsPage(
	_props: Readonly<DashboardAdministratorReportsPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("National consortia reports")}</HeaderTitle>
				<HeaderDescription>
					{t("Manage all National consortia reports in the DARIAH knowledge base.")}
				</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
