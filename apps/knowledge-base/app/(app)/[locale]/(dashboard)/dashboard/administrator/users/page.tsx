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

interface DashboardAdministratorUsersPageProps extends PageProps<"/[locale]/dashboard/administrator/users"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorUsersPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Users"),
	});

	return metadata;
}

export default function DashboardAdministratorUsersPage(
	_props: Readonly<DashboardAdministratorUsersPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Users")}</HeaderTitle>
				<HeaderDescription>{t("Manage all users in the DARIAH knowledge base.")}</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
