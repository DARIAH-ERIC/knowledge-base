import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { InstitutionsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_components/institutions-page";
import { getInstitutions } from "@/lib/data/institutions";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import {
	getListSearchParams,
	getListSortSearchParams,
	type ListSortDirection,
} from "@/lib/server/list-search-params";

interface DashboardAdministratorInstitutionsPageProps extends PageProps<"/[locale]/dashboard/administrator/institutions"> {}

const pageSize = 10;
const defaultSort = "name" as const;
const validSorts = ["name", "country", "status"] as const;

function createListHref(
	q: string,
	page: number,
	sort: (typeof validSorts)[number],
	dir: ListSortDirection,
): string {
	const searchParams = new URLSearchParams();

	if (q !== "") {
		searchParams.set("q", q);
	}

	if (page > 1) {
		searchParams.set("page", String(page));
	}

	if (sort !== defaultSort || dir !== "asc") {
		searchParams.set("sort", sort);
		searchParams.set("dir", dir);
	}

	const query = searchParams.toString();

	return `/dashboard/administrator/institutions${query !== "" ? `?${query}` : ""}`;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorInstitutionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Institutions"),
	});

	return metadata;
}

export default async function DashboardAdministratorInstitutionsPage(
	props: Readonly<DashboardAdministratorInstitutionsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const { dir, sort } = getListSortSearchParams(rawSearchParams, {
		defaultDir: "asc",
		defaultSort,
		validSorts,
	});
	const institutions = await getInstitutions({
		limit: pageSize,
		offset: (page - 1) * pageSize,
		q,
		sort,
		dir,
	});
	const totalPages = Math.max(Math.ceil(institutions.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages, sort, dir), locale: locale as IntlLocale });
	}

	return (
		<InstitutionsPage
			key={`${q}:${sort}:${dir}:${String(page)}`}
			dir={dir}
			institutions={institutions}
			page={page}
			q={q}
			sort={sort}
		/>
	);
}
