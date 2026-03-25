import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { AssetsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_components/assets-page";
import { imageGridOptions } from "@/config/assets.config";
import { getAssetsForDashboard } from "@/lib/data/cached/assets";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteAssetsPageProps extends PageProps<"/[locale]/dashboard/website/assets"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteAssetsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Assets"),
	});

	return metadata;
}

export default function DashboardWebsiteAssetsPage(
	_props: Readonly<DashboardWebsiteAssetsPageProps>,
): ReactNode {
	const assets = getAssetsForDashboard({ imageUrlOptions: imageGridOptions });

	return (
		<Suspense fallback={<LoadingScreen />}>
			<AssetsPage assets={assets} />
		</Suspense>
	);
}
