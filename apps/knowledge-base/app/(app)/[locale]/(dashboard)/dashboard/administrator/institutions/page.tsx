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

interface DashboardAdministratorInstitutionsPageProps extends PageProps<"/[locale]/dashboard/administrator/institutions"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorInstitutionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Institutions"),
	});

	return metadata;
}

export default function DashboardAdministratorInstitutionsPage(
	_props: Readonly<DashboardAdministratorInstitutionsPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Institutions")}</HeaderTitle>
				<HeaderDescription>
					{t("Manage all institutions in the DARIAH knowledge base.")}
				</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
