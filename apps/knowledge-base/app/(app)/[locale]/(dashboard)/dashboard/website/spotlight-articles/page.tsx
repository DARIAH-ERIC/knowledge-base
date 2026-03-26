import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { SpotlightArticlesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_components/spotlight-articles-page";
import { getSpotlightArticles } from "@/lib/data/cached/spotlight-articles";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteSpotlightArticlesPageProps extends PageProps<"/[locale]/dashboard/website/spotlight-articles"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteSpotlightArticlesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Spotlight articles"),
	});

	return metadata;
}

export default function DashboardWebsiteSpotlightArticlesPage(
	_props: Readonly<DashboardWebsiteSpotlightArticlesPageProps>,
): ReactNode {
	const spotlightArticles = getSpotlightArticles({ limit: 500 });

	return (
		<Suspense fallback={<LoadingScreen />}>
			<SpotlightArticlesPage spotlightArticles={spotlightArticles} />
		</Suspense>
	);
}
