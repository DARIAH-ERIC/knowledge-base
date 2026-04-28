import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { NationalConsortiumEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortium-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOrganisationalUnitEditDataForAdmin } from "@/lib/data/admin-organisational-units";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getEntityRelationOptions, getResourceRelationOptions } from "@/lib/data/relations";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditNationalConsortiumPageProps {
	params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditNationalConsortiumPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit national consortium"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditNationalConsortiumPage(
	props: Readonly<DashboardAdministratorEditNationalConsortiumPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;
	const { user } = await assertAuthenticated();

	const [
		{ items: initialAssets },
		initialRelatedEntities,
		initialRelatedResources,
		nationalConsortiumData,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getOrganisationalUnitEditDataForAdmin(user, {
			slug,
			unitType: "national_consortium",
		}),
	]);

	if (nationalConsortiumData == null) {
		notFound();
	}

	const {
		relations,
		relatedEntityIds,
		relatedResourceIds,
		selectedRelatedEntities,
		selectedRelatedResources,
		unit: nationalConsortium,
		unitRelationStatusOptions,
	} = nationalConsortiumData;

	const image =
		nationalConsortium.image != null
			? {
					...nationalConsortium.image,
					url: images.generateSignedImageUrl({
						key: nationalConsortium.image.key,
						options: imageGridOptions,
					}).url,
				}
			: null;

	return (
		<NationalConsortiumEditForm
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			nationalConsortium={{ ...nationalConsortium, image }}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			unitRelationStatusOptions={unitRelationStatusOptions}
		/>
	);
}
