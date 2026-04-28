import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { GovernanceBodyEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_components/governance-body-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOrganisationalUnitEditDataForAdmin } from "@/lib/data/admin-organisational-units";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getEntityRelationOptions, getResourceRelationOptions } from "@/lib/data/relations";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditGovernanceBodyPageProps {
	params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditGovernanceBodyPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit governance body"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditGovernanceBodyPage(
	props: Readonly<DashboardAdministratorEditGovernanceBodyPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;
	const { user } = await assertAuthenticated();

	const [
		{ items: initialAssets },
		initialRelatedEntities,
		initialRelatedResources,
		governanceBodyData,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getOrganisationalUnitEditDataForAdmin(user, { slug, unitType: "governance_body" }),
	]);

	if (governanceBodyData == null) {
		notFound();
	}

	const {
		relations,
		relatedEntityIds,
		relatedResourceIds,
		selectedRelatedEntities,
		selectedRelatedResources,
		unit: governanceBody,
		unitRelationStatusOptions,
	} = governanceBodyData;

	const image =
		governanceBody.image != null
			? {
					...governanceBody.image,
					url: images.generateSignedImageUrl({
						key: governanceBody.image.key,
						options: imageGridOptions,
					}).url,
				}
			: null;

	return (
		<GovernanceBodyEditForm
			governanceBody={{ ...governanceBody, image }}
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			unitRelationStatusOptions={unitRelationStatusOptions}
		/>
	);
}
