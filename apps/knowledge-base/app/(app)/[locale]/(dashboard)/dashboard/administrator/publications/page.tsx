import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { PublicationsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_components/publications-page";
import { dashboardPageSize } from "@/config/pagination.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getPublicationsForAdmin } from "@/lib/data/publications";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import {
	type ListSortDirection,
	getListSearchParams,
	getListSortSearchParams,
} from "@/lib/server/list-search-params";

const defaultSort = "title" as const;
const validSorts = ["title", "publicationYear", "status"] as const;

function createListHref(
	q: string,
	page: number,
	sort: (typeof validSorts)[number],
	dir: ListSortDirection,
): string {
	const params = new URLSearchParams();
	if (q !== "") {
		params.set("q", q);
	}
	if (page > 1) {
		params.set("page", String(page));
	}
	if (sort !== defaultSort || dir !== "asc") {
		params.set("sort", sort);
		params.set("dir", dir);
	}
	const query = params.toString();
	return `/dashboard/administrator/publications${query === "" ? "" : `?${query}`}`;
}

export async function generateMetadata(
	_props: unknown,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();
	return createMetadata(resolvingMetadata, { title: t("Administrator dashboard - Publications") });
}

export default async function Page(
	props: Readonly<PageProps<"/[locale]/dashboard/administrator/publications">>,
): Promise<ReactNode> {
	const [{ locale }, rawSearchParams, { user }] = await Promise.all([
		props.params,
		props.searchParams,
		assertAuthenticated(),
	]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const { dir, sort } = getListSortSearchParams(rawSearchParams, {
		defaultDir: "asc",
		defaultSort,
		validSorts,
	});
	const publications = await getPublicationsForAdmin(user, {
		limit: dashboardPageSize,
		offset: (page - 1) * dashboardPageSize,
		q,
		sort,
		dir,
	});
	const totalPages = Math.max(Math.ceil(publications.total / dashboardPageSize), 1);
	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages, sort, dir), locale: locale as IntlLocale });
	}
	return <PublicationsPage dir={dir} page={page} publications={publications} q={q} sort={sort} />;
}
