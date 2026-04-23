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

interface DashboardAdministratorCountryReportsPageProps extends PageProps<"/[locale]/dashboard/administrator/country-reports"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCountryReportsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Reports"),
	});

	return metadata;
}

export default function DashboardAdministratorCountryReportsPage(
	_props: Readonly<DashboardAdministratorCountryReportsPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Country reports")}</HeaderTitle>
				<HeaderDescription>
					{t("Manage all country reports in the DARIAH knowledge base.")}
				</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
