import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { TableExample } from "@/components/ui/table-example";

interface DashboardWorkingGroupPageProps extends PageProps<"/[locale]/dashboard/working-groups/[slug]"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWorkingGroupPageProps>,
): Promise<Metadata> {
	const t = await getTranslations("DashboardWorkingGroupPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardWorkingGroupPage(
	_props: Readonly<DashboardWorkingGroupPageProps>,
): ReactNode {
	const t = useTranslations("DashboardWorkingGroupPage");

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<TableExample />
		</Main>
	);
}
