import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { GovernanceBodiesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_components/governance-bodies-page";
import { getGovernanceBodies } from "@/lib/data/governance-bodies";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams } from "@/lib/server/list-search-params";

interface DashboardAdministratorGovernanceBodiesPageProps extends PageProps<"/[locale]/dashboard/administrator/governance-bodies"> {}

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

	return `/dashboard/administrator/governance-bodies${query !== "" ? `?${query}` : ""}`;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorGovernanceBodiesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Governance bodies"),
	});

	return metadata;
}

export default async function DashboardAdministratorGovernanceBodiesPage(
	props: Readonly<DashboardAdministratorGovernanceBodiesPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const governanceBodies = await getGovernanceBodies({
		limit: pageSize,
		offset: (page - 1) * pageSize,
		q,
	});
	const totalPages = Math.max(Math.ceil(governanceBodies.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages), locale: locale as IntlLocale });
	}

	return (
		<GovernanceBodiesPage
			key={`${q}:${String(page)}`}
			governanceBodies={governanceBodies}
			page={page}
			q={q}
		/>
	);
}
