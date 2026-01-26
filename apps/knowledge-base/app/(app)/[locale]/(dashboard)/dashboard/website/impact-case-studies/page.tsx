import type { Metadata, ResolvingMetadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { ImpactCaseStudiesTable } from "@/components/ui/tables/impact-case-studies-table";
import { getImpactCaseStudies } from "@/lib/data/impact-case-studies";
import { createMetadata } from "@/lib/server/metadata";

interface DashboardWebsiteImpactCaseStudiesPageProps extends PageProps<"/[locale]/dashboard/website/impact-case-studies"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteImpactCaseStudiesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("DashboardWebsiteImpactCaseStudiesPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function DashboardWebsiteImpactCaseStudiesPage(
	_props: Readonly<DashboardWebsiteImpactCaseStudiesPageProps>,
): Promise<ReactNode> {
	const t = await getTranslations("DashboardWebsiteImpactCaseStudiesPage");

	const impactCaseStudies = await getImpactCaseStudies({});

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<ImpactCaseStudiesTable data={impactCaseStudies} />
		</Main>
	);
}
