import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ImpactCaseStudiesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_components/impact-case-studies-page";
import { getImpactCaseStudies } from "@/lib/data/cached/impact-case-studies";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams } from "@/lib/server/list-search-params";

interface DashboardWebsiteImpactCaseStudiesPageProps extends PageProps<"/[locale]/dashboard/website/impact-case-studies"> {}

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

	return `/dashboard/website/impact-case-studies${query !== "" ? `?${query}` : ""}`;
}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteImpactCaseStudiesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Impact case studies"),
	});

	return metadata;
}

export default async function DashboardWebsiteImpactCaseStudiesPage(
	props: Readonly<DashboardWebsiteImpactCaseStudiesPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const impactCaseStudies = await getImpactCaseStudies({
		limit: pageSize,
		offset: (page - 1) * pageSize,
		q,
	});
	const totalPages = Math.max(Math.ceil(impactCaseStudies.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages), locale: locale as IntlLocale });
	}

	return (
		<ImpactCaseStudiesPage
			key={`${q}:${String(page)}`}
			impactCaseStudies={impactCaseStudies}
			page={page}
			q={q}
		/>
	);
}
