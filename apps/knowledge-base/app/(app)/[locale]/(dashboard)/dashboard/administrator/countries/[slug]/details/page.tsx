import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CountryDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_components/country-details";
import { publishCountryAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_lib/publish-country.action";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOrganisationalUnitEditDataForAdmin } from "@/lib/data/admin-organisational-units";
import { ensureDraftVersion, getDocumentLifecycleState } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { getEntityRelationOptions, getResourceRelationOptions } from "@/lib/data/relations";
import { getSocialMediaOptions } from "@/lib/data/social-media";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCountryDetailsPageProps extends PageProps<"/[locale]/dashboard/administrator/countries/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCountryDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - View country"),
	});

	return metadata;
}

export default async function DashboardAdministratorCountryDetailsPage(
	props: Readonly<DashboardAdministratorCountryDetailsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams: searchParamsPromise } = props;

	const { slug } = await params;

	const { user } = await assertAuthenticated();

	const anyVersion = await db.query.organisationalUnits.findFirst({
		where: { entityVersion: { entity: { slug } } },
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

	const { draftVersionId, hasDraftChanges, publishedId } = await db.transaction(async (tx) => {
		const draftVersionId = await ensureDraftVersion(
			tx,
			documentId,
			organisationalUnitsLifecycleAdapter,
		);
		const { hasDraftChanges, publishedId } = await getDocumentLifecycleState(tx, documentId);
		return { draftVersionId, hasDraftChanges, publishedId };
	});

	/**
	 * The version selector and "with draft changes" UX only kick in when the draft actually diverges
	 * from the published version. Right after publish, a draft row still exists as a clone of the new
	 * published version but has no real changes — we treat that as published-only.
	 */
	const showVersionSelector = hasDraftChanges && publishedId != null;

	const { version } = await searchParamsPromise;
	let selectedVersion: "draft" | "published";
	let versionId: string | null;

	if (showVersionSelector) {
		selectedVersion = version === "published" ? "published" : "draft";
		versionId = selectedVersion === "published" ? publishedId : draftVersionId;
	} else if (publishedId != null) {
		selectedVersion = "published";
		versionId = publishedId;
	} else {
		selectedVersion = "draft";
		versionId = draftVersionId;
	}

	if (!versionId) {
		notFound();
	}

	const [
		descriptionRows,
		initialRelatedEntities,
		initialRelatedResources,
		initialSocialMedia,
		countryData,
	] = await Promise.all([
		db
			.select({
				content: schema.richTextContentBlocks.content,
				id: schema.richTextContentBlocks.id,
			})
			.from(schema.richTextContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(
				and(
					eq(schema.fields.entityVersionId, versionId),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getSocialMediaOptions(),
		getOrganisationalUnitEditDataForAdmin(user, {
			slug,
			unitType: "country",
			publishedVersionId: publishedId,
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
	} = countryData;

	const description = descriptionRows.at(0)?.content ?? null;

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
		<CountryDetails
			country={{ ...country, description, image }}
			documentId={documentId}
			hasDraft={hasDraftChanges}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			initialSocialMediaIds={socialMediaIds}
			initialSocialMediaItems={initialSocialMedia.items}
			initialSocialMediaTotal={initialSocialMedia.total}
			isPublished={publishedId != null}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			selectedSocialMediaItems={selectedSocialMediaItems}
			publishAction={publishCountryAction}
			selectedVersion={selectedVersion}
		/>
	);
}
