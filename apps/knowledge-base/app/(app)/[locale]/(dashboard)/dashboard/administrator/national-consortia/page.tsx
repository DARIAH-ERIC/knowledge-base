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

interface DashboardAdministratorNationalConsortiaPageProps extends PageProps<"/[locale]/dashboard/administrator/national-consortia"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorNationalConsortiaPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - National consortia"),
	});

	return metadata;
}

export default function DashboardAdministratorNationalConsortiaPage(
	_props: Readonly<DashboardAdministratorNationalConsortiaPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("National consortia")}</HeaderTitle>
				<HeaderDescription>
					{t("Manage all national consortia in the DARIAH knowledge base.")}
				</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
