import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ContributionsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/contributions/_components/contributions-page";
import { getContributions } from "@/lib/data/contributions";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams } from "@/lib/server/list-search-params";

interface DashboardAdministratorContributionsPageProps extends PageProps<"/[locale]/dashboard/administrator/contributions"> {}

const pageSize = 20;

function createListHref(q: string, page: number): string {
	const searchParams = new URLSearchParams();

	if (q !== "") {
		searchParams.set("q", q);
	}

	if (page > 1) {
		searchParams.set("page", String(page));
	}

	const query = searchParams.toString();

	return `/dashboard/administrator/contributions${query !== "" ? `?${query}` : ""}`;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorContributionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Contributions"),
	});

	return metadata;
}

export default async function DashboardAdministratorContributionsPage(
	props: Readonly<DashboardAdministratorContributionsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const contributions = await getContributions({
		limit: pageSize,
		offset: (page - 1) * pageSize,
		q,
	});
	const totalPages = Math.max(Math.ceil(contributions.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages), locale: locale as IntlLocale });
	}

	return (
		<ContributionsPage
			key={`${q}:${String(page)}`}
			contributions={contributions}
			page={page}
			q={q}
		/>
	);
}
