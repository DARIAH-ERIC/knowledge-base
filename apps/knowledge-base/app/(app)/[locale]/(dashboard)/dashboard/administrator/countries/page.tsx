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

interface DashboardAdministratorCountriesPageProps extends PageProps<"/[locale]/dashboard/administrator/countries"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCountriesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Countries"),
	});

	return metadata;
}

export default function DashboardAdministratorCountriesPage(
	_props: Readonly<DashboardAdministratorCountriesPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Countries")}</HeaderTitle>
				<HeaderDescription>
					{t("Manage all countries in the DARIAH knowledge base.")}
				</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
