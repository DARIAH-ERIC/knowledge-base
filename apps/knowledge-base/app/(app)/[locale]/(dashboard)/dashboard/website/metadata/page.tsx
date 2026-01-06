import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { TableExample } from "@/components/ui/table-example";

interface DashboardWebsiteMetadataPageProps extends PageProps<"/[locale]/dashboard/website/metadata"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteMetadataPageProps>,
): Promise<Metadata> {
	const t = await getTranslations("DashboardWebsiteMetadataPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardWebsiteMetadataPage(
	_props: Readonly<DashboardWebsiteMetadataPageProps>,
): ReactNode {
	const t = useTranslations("DashboardWebsiteMetadataPage");

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<TableExample />
		</Main>
	);
}
