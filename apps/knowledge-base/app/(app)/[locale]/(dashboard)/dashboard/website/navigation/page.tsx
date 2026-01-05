import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";

interface DashboardWebsiteNavigationPageProps extends PageProps<"/[locale]/dashboard/website/navigation"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteNavigationPageProps>,
): Promise<Metadata> {
	const t = await getTranslations("DashboardWebsiteNavigationPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardWebsiteNavigationPage(
	_props: Readonly<DashboardWebsiteNavigationPageProps>,
): ReactNode {
	const t = useTranslations("DashboardWebsiteNavigationPage");

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
		</Main>
	);
}
