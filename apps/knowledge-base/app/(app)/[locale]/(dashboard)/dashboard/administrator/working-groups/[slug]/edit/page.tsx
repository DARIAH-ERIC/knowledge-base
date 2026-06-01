import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { WorkingGroupEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getContributionPersonOptions } from "@/lib/data/contributions";
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
import { getUnitRelationStatusOptions, getUnitRelations } from "@/lib/data/unit-relations";
import { getWorkingGroupChairs } from "@/lib/data/working-group-chairs";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditWorkingGroupPageProps extends PageProps<"/[locale]/dashboard/administrator/working-groups/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditWorkingGroupPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit working group"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditWorkingGroupPage(
	props: Readonly<DashboardAdministratorEditWorkingGroupPageProps>,
): Promise<ReactNode> {
	const { params } = props;

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

	const [
		{ items: initialAssets },
		initialRelatedEntities,
		initialRelatedResources,
		initialPersons,
		initialSocialMedia,
		workingGroup,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getContributionPersonOptions(),
		getSocialMediaOptions(),
		db.query.organisationalUnits.findFirst({
			where: { id: draftVersionId },
			columns: {
				acronym: true,
				id: true,
				name: true,
				sshocMarketplaceActorId: true,
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

	if (workingGroup == null) {
		notFound();
	}

	const [
		{ relatedEntityIds, relatedResourceIds },
		relations,
		chairs,
		descriptionRows,
		socialMediaRows,
	] = await Promise.all([
		getEntityRelations(documentId),
		getUnitRelations(documentId),
		getWorkingGroupChairs(documentId),
		db
			.select({ content: schema.richTextContentBlocks.content })
			.from(schema.richTextContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(
				and(
					eq(schema.fields.entityVersionId, workingGroup.id),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1),
		db.query.organisationalUnitsToSocialMedia.findMany({
			where: { organisationalUnitId: workingGroup.id },
			columns: { socialMediaId: true },
		}),
	]);

	const description = descriptionRows.at(0)?.content;
	const socialMediaIds = socialMediaRows.map((row) => row.socialMediaId);

	const unitRelationStatusOptions = await getUnitRelationStatusOptions("working_group");

	const [selectedRelatedEntities, selectedRelatedResources, selectedSocialMediaItems] =
		await Promise.all([
			getEntityRelationOptionsByIds(relatedEntityIds),
			getResourceRelationOptionsByIds(relatedResourceIds),
			getSocialMediaOptionsByIds(socialMediaIds),
		]);

	const image =
		workingGroup.image != null
			? {
					...workingGroup.image,
					url: images.generateSignedImageUrl({
						key: workingGroup.image.key,
						options: imageGridOptions,
					}).url,
				}
			: null;

	return (
		<WorkingGroupEditForm
			chairs={chairs}
			documentId={documentId}
			hasDraftChanges={hasDraftChanges}
			initialAssets={initialAssets}
			initialPersonItems={initialPersons.items}
			initialPersonTotal={initialPersons.total}
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
			unitRelationStatusOptions={unitRelationStatusOptions}
			workingGroup={{ ...workingGroup, description, image }}
		/>
	);
}
