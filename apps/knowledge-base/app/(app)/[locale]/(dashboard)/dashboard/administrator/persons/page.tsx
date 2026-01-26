import type { Metadata, ResolvingMetadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { TableExample } from "@/components/ui/table-example";
import { createMetadata } from "@/lib/server/metadata";

interface DashboardAdministratorPersonsPageProps extends PageProps<"/[locale]/dashboard/administrator/persons"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorPersonsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("DashboardAdministratorPersonsPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default function DashboardAdministratorPersonsPage(
	_props: Readonly<DashboardAdministratorPersonsPageProps>,
): ReactNode {
	const t = useTranslations("DashboardAdministratorPersonsPage");

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<TableExample />
		</Main>
	);
}
