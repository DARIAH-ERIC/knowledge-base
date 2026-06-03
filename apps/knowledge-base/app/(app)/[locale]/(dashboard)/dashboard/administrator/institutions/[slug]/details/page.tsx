import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { InstitutionDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_components/institution-details";
import { publishInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/publish-institution.action";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { ensureDraftVersion, getDocumentLifecycleState } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import {
	getEntityRelationOptions,
	getEntityRelationOptionsByIds,
	getEntityRelations,
	getResourceRelationOptions,
	getResourceRelationOptionsByIds,
} from "@/lib/data/relations";
import { getSocialMediaOptions, getSocialMediaOptionsByIds } from "@/lib/data/social-media";
import { getUnitRelations } from "@/lib/data/unit-relations";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorInstitutionDetailsPageProps extends PageProps<"/[locale]/dashboard/administrator/institutions/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorInstitutionDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - View institution"),
	});

	return metadata;
}

export default async function DashboardAdministratorInstitutionDetailsPage(
	props: Readonly<DashboardAdministratorInstitutionDetailsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams: searchParamsPromise } = props;

	const { slug } = await params;

	await assertAuthenticated();

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

	const [initialRelatedEntities, initialRelatedResources, initialSocialMedia, institution] =
		await Promise.all([
			getEntityRelationOptions(),
			getResourceRelationOptions(),
			getSocialMediaOptions(),
			db.query.organisationalUnits.findFirst({
				where: { id: draftVersionId },
				columns: {
					acronym: true,
					id: true,
					name: true,
					summary: true,
				},
				with: {
					entityVersion: {
						columns: { id: true },
						with: {
							entity: {
								columns: {
									id: true,
									slug: true,
								},
							},
						},
					},
					image: {
						columns: {
							key: true,
							label: true,
						},
					},
				},
			}),
		]);

	if (institution == null) {
		notFound();
	}

	const [{ relatedEntityIds, relatedResourceIds }, relations, socialMediaRows, descriptionRows] =
		await Promise.all([
			getEntityRelations(documentId),
			getUnitRelations(documentId),
			db.query.organisationalUnitsToSocialMedia.findMany({
				where: { organisationalUnitId: institution.id },
				columns: { socialMediaId: true },
			}),
			db
				.select({ content: schema.richTextContentBlocks.content })
				.from(schema.richTextContentBlocks)
				.innerJoin(
					schema.contentBlocks,
					eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
				)
				.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
				.innerJoin(
					schema.entityTypesFieldsNames,
					eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
				)
				.where(
					and(
						eq(schema.fields.entityVersionId, institution.id),
						eq(schema.entityTypesFieldsNames.fieldName, "description"),
					),
				)
				.limit(1),
		]);

	const description = descriptionRows.at(0)?.content;
	const socialMediaIds = socialMediaRows.map((row) => row.socialMediaId);

	const [selectedRelatedEntities, selectedRelatedResources, selectedSocialMediaItems] =
		await Promise.all([
			getEntityRelationOptionsByIds(relatedEntityIds),
			getResourceRelationOptionsByIds(relatedResourceIds),
			getSocialMediaOptionsByIds(socialMediaIds),
		]);

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
		<InstitutionDetails
			documentId={documentId}
			institution={{ ...institution, description, image }}
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
			publishAction={publishInstitutionAction}
			selectedVersion={selectedVersion}
		/>
	);
}
