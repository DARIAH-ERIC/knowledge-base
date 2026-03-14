import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { ImpactCaseStudiesTable } from "@/components/ui/tables/impact-case-studies-table";
import { getImpactCaseStudies } from "@/lib/data/cached/impact-case-studies";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteImpactCaseStudiesPageProps extends PageProps<"/[locale]/dashboard/website/impact-case-studies"> {}

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
	_props: Readonly<DashboardWebsiteImpactCaseStudiesPageProps>,
): Promise<ReactNode> {
	const t = await getExtracted();

	const impactCaseStudies = await getImpactCaseStudies({});

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">
				{t("Impact case studies")}
			</h1>
			<ImpactCaseStudiesTable data={impactCaseStudies} />
		</Main>
	);
}
