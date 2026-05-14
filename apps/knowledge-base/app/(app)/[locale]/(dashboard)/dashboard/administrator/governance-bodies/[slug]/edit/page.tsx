import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { GovernanceBodyEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_components/governance-body-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getContributionPersonOptions } from "@/lib/data/contributions";
import { ensureDraftVersion, getDocumentVersions } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { getPersonRelationRoleOptions, getPersonRelations } from "@/lib/data/person-relations";
import {
	getEntityRelationOptions,
	getEntityRelationOptionsByIds,
	getEntityRelations,
	getResourceRelationOptions,
	getResourceRelationOptionsByIds,
} from "@/lib/data/relations";
import { getUnitRelationStatusOptions, getUnitRelations } from "@/lib/data/unit-relations";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditGovernanceBodyPageProps extends PageProps<"/[locale]/dashboard/administrator/governance-bodies/[slug]/edit"> {}

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

	const { draftVersionId, publishedId } = await db.transaction(async (tx) => {
		const draftVersionId = await ensureDraftVersion(
			tx,
			documentId,
			organisationalUnitsLifecycleAdapter,
		);
		const { publishedId } = await getDocumentVersions(tx, documentId);
		return { draftVersionId, publishedId };
	});

	const [
		{ items: initialAssets },
		initialRelatedEntities,
		initialRelatedResources,
		governanceBody,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
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

	if (governanceBody == null) {
		notFound();
	}

	const [
		{ items: initialPersonItems, total: initialPersonTotal },
		personRelations,
		personRelationRoleOptions,
		{ relatedEntityIds, relatedResourceIds },
		relations,
		unitRelationStatusOptions,
		descriptionRows,
	] = await Promise.all([
		getContributionPersonOptions(),
		getPersonRelations(governanceBody.id),
		getPersonRelationRoleOptions("governance_body"),
		getEntityRelations(documentId),
		getUnitRelations(governanceBody.id),
		getUnitRelationStatusOptions("governance_body"),
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
					eq(schema.fields.entityVersionId, governanceBody.id),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1),
	]);

	const description = descriptionRows.at(0)?.content;

	const [selectedRelatedEntities, selectedRelatedResources] = await Promise.all([
		getEntityRelationOptionsByIds(relatedEntityIds),
		getResourceRelationOptionsByIds(relatedResourceIds),
	]);

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
			documentId={documentId}
			governanceBody={{ ...governanceBody, description, image }}
			initialAssets={initialAssets}
			initialPersonItems={initialPersonItems}
			initialPersonTotal={initialPersonTotal}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			isPublished={publishedId != null}
			personRelationRoleOptions={personRelationRoleOptions}
			personRelations={personRelations}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			unitRelationStatusOptions={unitRelationStatusOptions}
		/>
	);
}
