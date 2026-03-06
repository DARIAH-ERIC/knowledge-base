import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { TableExample } from "@/components/ui/table-example";
import { client } from "@/lib/mailchimp/client";

interface DashboardAdministratorNewslettersPageProps extends PageProps<"/[locale]/dashboard/administrator/institutions"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorNewslettersPageProps>,
): Promise<Metadata> {
	const t = await getTranslations("DashboardAdministratorNewslettersPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardAdministratorNewslettersPage(
	_props: Readonly<DashboardAdministratorNewslettersPageProps>,
): ReactNode {
	const t = useTranslations("DashboardAdministratorNewslettersPage");

	const _newsletters = client.get();

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<TableExample />
		</Main>
	);
}
