import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { WorkingGroupCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-create-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getAvailableEntities, getAvailableResources } from "@/lib/data/relations";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCreateWorkingGroupPageProps extends PageProps<"/[locale]/dashboard/administrator/working-groups/create"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCreateWorkingGroupPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Create working group"),
	});

	return metadata;
}

export default async function DashboardAdministratorCreateWorkingGroupPage(
	_props: Readonly<DashboardAdministratorCreateWorkingGroupPageProps>,
): Promise<ReactNode> {
	const [{ items: initialAssets }, relatedEntities, relatedResources] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getAvailableEntities(),
		getAvailableResources(),
	]);

	return (
		<WorkingGroupCreateForm
			initialAssets={initialAssets}
			relatedEntities={relatedEntities}
			relatedResources={relatedResources}
		/>
	);
}
