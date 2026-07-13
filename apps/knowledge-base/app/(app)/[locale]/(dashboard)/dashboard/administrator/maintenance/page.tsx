import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { MaintenanceDashboard } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/maintenance-dashboard";
import { imageGridOptions } from "@/config/assets.config";
import { assertAdminPageAccess } from "@/lib/auth/session";
import { getUnusedAssets } from "@/lib/data/asset-cleanup";
import { getEmptyContentBlocks } from "@/lib/data/content-block-cleanup";
import { getDataIntegrityFindings } from "@/lib/data/data-integrity";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorMaintenancePageProps extends PageProps<"/[locale]/dashboard/administrator/maintenance"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorMaintenancePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Maintenance"),
	});

	return metadata;
}

export default async function DashboardAdministratorMaintenancePage(
	_props: Readonly<DashboardAdministratorMaintenancePageProps>,
): Promise<ReactNode> {
	await assertAdminPageAccess();

	const [integrity, unusedAssets, emptyContentBlocks] = await Promise.all([
		getDataIntegrityFindings(),
		getUnusedAssets({ imageUrlOptions: imageGridOptions }),
		getEmptyContentBlocks(),
	]);

	return (
		<MaintenanceDashboard
			emptyContentBlocks={emptyContentBlocks}
			integrity={integrity}
			unusedAssets={unusedAssets}
		/>
	);
}
