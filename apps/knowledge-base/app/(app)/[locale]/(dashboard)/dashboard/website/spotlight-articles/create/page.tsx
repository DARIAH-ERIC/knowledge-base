import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { SpotlightArticleCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_components/spotlight-article-create-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteCreateSpotlightArticlePageProps extends PageProps<"/[locale]/dashboard/website/spotlight-articles/create"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteCreateSpotlightArticlePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Create spotlight article"),
	});

	return metadata;
}

export default async function DashboardWebsiteCreateSpotlightArticlePage(
	_props: Readonly<DashboardWebsiteCreateSpotlightArticlePageProps>,
): Promise<ReactNode> {
	const { items: assets } = await getMediaLibraryAssets({ imageUrlOptions: imageGridOptions });

	return <SpotlightArticleCreateForm assets={assets} />;
}
