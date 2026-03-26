import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ImpactCaseStudyCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_components/impact-case-study-create-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteCreateImpactCaseStudyPageProps extends PageProps<"/[locale]/dashboard/website/impact-case-studies/create"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteCreateImpactCaseStudyPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Create impact case study"),
	});

	return metadata;
}

export default async function DashboardWebsiteCreateImpactCaseStudyPage(
	_props: Readonly<DashboardWebsiteCreateImpactCaseStudyPageProps>,
): Promise<ReactNode> {
	const { items: assets } = await getMediaLibraryAssets({ imageUrlOptions: imageGridOptions });

	return <ImpactCaseStudyCreateForm assets={assets} />;
}
