import type { Metadata, ResolvingMetadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { NewsTable } from "@/components/ui/tables/news-table";
import { getNews } from "@/lib/data/news";
import { createMetadata } from "@/lib/server/metadata";

interface DashboardWebsiteNewsPageProps extends PageProps<"/[locale]/dashboard/website/news"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteNewsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("DashboardWebsiteNewsPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function DashboardWebsiteNewsPage(
	_props: Readonly<DashboardWebsiteNewsPageProps>,
): Promise<ReactNode> {
	const t = await getTranslations("DashboardWebsiteNewsPage");

	const news = await getNews({});

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<NewsTable data={news} />
		</Main>
	);
}
