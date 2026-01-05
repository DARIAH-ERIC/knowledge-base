import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { TableExample } from "@/components/ui/table-example";

interface DashboardWebsiteEventsPageProps extends PageProps<"/[locale]/dashboard/website/events"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEventsPageProps>,
): Promise<Metadata> {
	const t = await getTranslations("DashboardWebsiteEventsPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardWebsiteEventsPage(
	_props: Readonly<DashboardWebsiteEventsPageProps>,
): ReactNode {
	const t = useTranslations("DashboardWebsiteEventsPage");

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<TableExample />
		</Main>
	);
}
