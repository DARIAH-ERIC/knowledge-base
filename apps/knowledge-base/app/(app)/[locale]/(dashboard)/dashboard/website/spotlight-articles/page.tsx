import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { SpotlightArticlesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_components/spotlight-articles-page";
import { getSpotlightArticles } from "@/lib/data/cached/spotlight-articles";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams } from "@/lib/server/list-search-params";

interface DashboardWebsiteSpotlightArticlesPageProps extends PageProps<"/[locale]/dashboard/website/spotlight-articles"> {}

const pageSize = 10;

function createListHref(q: string, page: number): string {
	const searchParams = new URLSearchParams();

	if (q !== "") {
		searchParams.set("q", q);
	}

	if (page > 1) {
		searchParams.set("page", String(page));
	}

	const query = searchParams.toString();

	return `/dashboard/website/spotlight-articles${query !== "" ? `?${query}` : ""}`;
}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteSpotlightArticlesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Spotlight articles"),
	});

	return metadata;
}

export default async function DashboardWebsiteSpotlightArticlesPage(
	props: Readonly<DashboardWebsiteSpotlightArticlesPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const spotlightArticles = await getSpotlightArticles({
		limit: pageSize,
		offset: (page - 1) * pageSize,
		q,
	});
	const totalPages = Math.max(Math.ceil(spotlightArticles.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages), locale: locale as IntlLocale });
	}

	return (
		<SpotlightArticlesPage
			key={`${q}:${String(page)}`}
			page={page}
			q={q}
			spotlightArticles={spotlightArticles}
		/>
	);
}
