import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { ImpactCaseStudiesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_components/impact-case-studies-page";
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

export default function DashboardWebsiteImpactCaseStudiesPage(
	_props: Readonly<DashboardWebsiteImpactCaseStudiesPageProps>,
): ReactNode {
	const impactCaseStudies = getImpactCaseStudies({ limit: 500 });

	return (
		<Suspense fallback={<LoadingScreen />}>
			<ImpactCaseStudiesPage impactCaseStudies={impactCaseStudies} />
		</Suspense>
	);
}
