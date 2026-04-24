import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { NewsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-page";
import { getNews } from "@/lib/data/cached/news";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams } from "@/lib/server/list-search-params";

interface DashboardWebsiteNewsPageProps extends PageProps<"/[locale]/dashboard/website/news"> {}

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

	return `/dashboard/website/news${query !== "" ? `?${query}` : ""}`;
}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteNewsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - News"),
	});

	return metadata;
}

export default async function DashboardWebsiteNewsPage(
	props: Readonly<DashboardWebsiteNewsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const news = await getNews({ limit: pageSize, offset: (page - 1) * pageSize, q });
	const totalPages = Math.max(Math.ceil(news.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages), locale: locale as IntlLocale });
	}

	return <NewsPage key={`${q}:${String(page)}`} news={news} page={page} q={q} />;
}
