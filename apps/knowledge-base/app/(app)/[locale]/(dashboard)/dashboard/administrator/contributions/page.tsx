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

interface DashboardAdministratorContributionsPageProps extends PageProps<"/[locale]/dashboard/administrator/contributions"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorContributionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Contributions"),
	});

	return metadata;
}

export default function DashboardAdministratorContributionsPage(
	_props: Readonly<DashboardAdministratorContributionsPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Contributions")}</HeaderTitle>
				<HeaderDescription>
					{t("Manage all contributions in the DARIAH knowledge base.")}
				</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
