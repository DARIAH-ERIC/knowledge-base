import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { PagesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_components/pages-page";
import { getPages } from "@/lib/data/cached/pages";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsitePagesPageProps extends PageProps<"/[locale]/dashboard/website/pages"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsitePagesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Pages"),
	});

	return metadata;
}

export default function DashboardWebsitePagesPage(
	_props: Readonly<DashboardWebsitePagesPageProps>,
): ReactNode {
	const pages = getPages({ limit: 500 });

	return (
		<Suspense fallback={<LoadingScreen />}>
			<PagesPage pages={pages} />
		</Suspense>
	);
}
