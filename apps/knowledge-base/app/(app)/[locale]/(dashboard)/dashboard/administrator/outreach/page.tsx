import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { TableExample } from "@/components/ui/table-example";

interface DashboardAdministratorOutreachPageProps extends PageProps<"/[locale]/dashboard/administrator/outreach"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorOutreachPageProps>,
): Promise<Metadata> {
	const t = await getTranslations("DashboardAdministratorOutreachPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardAdministratorOutreachPage(
	_props: Readonly<DashboardAdministratorOutreachPageProps>,
): ReactNode {
	const t = useTranslations("DashboardAdministratorOutreachPage");

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<TableExample />
		</Main>
	);
}
