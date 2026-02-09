import type { Metadata, ResolvingMetadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { SpotlightArticlesTable } from "@/components/ui/tables/spotlight-articles-table";
import { getSpotlightArticles } from "@/lib/data/cached/spotlight-articles";
import { createMetadata } from "@/lib/server/metadata";

interface DashboardWebsiteSpotlightArticlesPageProps extends PageProps<"/[locale]/dashboard/website/spotlight-articles"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteSpotlightArticlesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("DashboardWebsiteSpotlightArticlesPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function DashboardWebsiteSpotlightArticlesPage(
	_props: Readonly<DashboardWebsiteSpotlightArticlesPageProps>,
): Promise<ReactNode> {
	const t = await getTranslations("DashboardWebsiteSpotlightArticlesPage");

	const spotlightArticles = await getSpotlightArticles({});

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<SpotlightArticlesTable data={spotlightArticles} />
		</Main>
	);
}
