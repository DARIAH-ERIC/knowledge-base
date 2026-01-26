import type { Metadata, ResolvingMetadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { TableExample } from "@/components/ui/table-example";
import { createMetadata } from "@/lib/server/metadata";

interface DashboardAdministratorWorkingGroupsPageProps extends PageProps<"/[locale]/dashboard/administrator/working-groups"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorWorkingGroupsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("DashboardAdministratorWorkingGroupsPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default function DashboardAdministratorWorkingGroupsPage(
	_props: Readonly<DashboardAdministratorWorkingGroupsPageProps>,
): ReactNode {
	const t = useTranslations("DashboardAdministratorWorkingGroupsPage");

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<TableExample />
		</Main>
	);
}
