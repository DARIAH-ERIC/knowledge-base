import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { NewsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-page";
import { getNews } from "@/lib/data/cached/news";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteNewsPageProps extends PageProps<"/[locale]/dashboard/website/news"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteNewsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - News"),
	});

	return metadata;
}

export default function DashboardWebsiteNewsPage(
	_props: Readonly<DashboardWebsiteNewsPageProps>,
): ReactNode {
	const news = getNews({ limit: 500 });

	return (
		<Suspense fallback={<LoadingScreen />}>
			<NewsPage news={news} />
		</Suspense>
	);
}
