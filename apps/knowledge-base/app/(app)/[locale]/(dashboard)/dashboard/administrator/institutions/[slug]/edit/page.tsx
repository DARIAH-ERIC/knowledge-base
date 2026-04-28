import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { InstitutionEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_components/institution-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOrganisationalUnitEditDataForAdmin } from "@/lib/data/admin-organisational-units";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getEntityRelationOptions, getResourceRelationOptions } from "@/lib/data/relations";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditInstitutionPageProps {
	params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditInstitutionPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit institution"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditInstitutionPage(
	props: Readonly<DashboardAdministratorEditInstitutionPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;
	const { user } = await assertAuthenticated();

	const [
		{ items: initialAssets },
		initialRelatedEntities,
		initialRelatedResources,
		institutionData,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getOrganisationalUnitEditDataForAdmin(user, { slug, unitType: "institution" }),
	]);

	if (institutionData == null) {
		notFound();
	}

	const {
		relations,
		relatedEntityIds,
		relatedResourceIds,
		selectedRelatedEntities,
		selectedRelatedResources,
		unit: institution,
		unitRelationStatusOptions,
	} = institutionData;

	const image =
		institution.image != null
			? {
					...institution.image,
					url: images.generateSignedImageUrl({
						key: institution.image.key,
						options: imageGridOptions,
					}).url,
				}
			: null;

	return (
		<InstitutionEditForm
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			institution={{ ...institution, image }}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			unitRelationStatusOptions={unitRelationStatusOptions}
		/>
	);
}
