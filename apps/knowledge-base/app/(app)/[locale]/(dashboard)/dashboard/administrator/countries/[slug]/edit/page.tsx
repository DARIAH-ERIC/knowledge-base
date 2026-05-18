import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CountryEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_components/country-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOrganisationalUnitEditDataForAdmin } from "@/lib/data/admin-organisational-units";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { ensureDraftVersion } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { getEntityRelationOptions, getResourceRelationOptions } from "@/lib/data/relations";
import { getSocialMediaOptions } from "@/lib/data/social-media";
import { db } from "@/lib/db";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditCountryPageProps extends PageProps<"/[locale]/dashboard/administrator/countries/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditCountryPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit country"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditCountryPage(
	props: Readonly<DashboardAdministratorEditCountryPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;
	const { user } = await assertAuthenticated();

	const anyVersion = await db.query.organisationalUnits.findFirst({
		where: { entityVersion: { entity: { slug } }, type: { type: "country" } },
		columns: {},
		with: {
			entityVersion: {
				columns: {},
				with: { entity: { columns: { id: true } } },
			},
		},
	});

	if (anyVersion == null) {
		notFound();
	}

	const documentId = anyVersion.entityVersion.entity.id;
	const draftVersionId = await db.transaction((tx) =>
		ensureDraftVersion(tx, documentId, organisationalUnitsLifecycleAdapter),
	);

	const [
		{ items: initialAssets },
		initialRelatedEntities,
		initialRelatedResources,
		initialSocialMedia,
		countryData,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getSocialMediaOptions(),
		getOrganisationalUnitEditDataForAdmin(user, {
			slug,
			unitType: "country",
			versionId: draftVersionId,
		}),
	]);

	if (countryData == null) {
		notFound();
	}

	const {
		relations,
		relatedEntityIds,
		relatedResourceIds,
		selectedRelatedEntities,
		selectedRelatedResources,
		selectedSocialMediaItems,
		socialMediaIds,
		unit: country,
		unitRelationStatusOptions,
	} = countryData;

	const image =
		country.image != null
			? {
					...country.image,
					url: images.generateSignedImageUrl({
						key: country.image.key,
						options: imageGridOptions,
					}).url,
				}
			: null;

	return (
		<CountryEditForm
			country={{ ...country, image }}
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			initialSocialMediaIds={socialMediaIds}
			initialSocialMediaItems={initialSocialMedia.items}
			initialSocialMediaTotal={initialSocialMedia.total}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			selectedSocialMediaItems={selectedSocialMediaItems}
			unitRelationStatusOptions={unitRelationStatusOptions}
		/>
	);
}
