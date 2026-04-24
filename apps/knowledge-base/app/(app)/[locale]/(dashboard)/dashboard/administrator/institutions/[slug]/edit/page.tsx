import { and, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { InstitutionEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_components/institution-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import {
	getEntityRelationOptions,
	getEntityRelationOptionsByIds,
	getEntityRelations,
	getResourceRelationOptions,
	getResourceRelationOptionsByIds,
} from "@/lib/data/relations";
import { getUnitRelations, getUnitRelationStatusOptions } from "@/lib/data/unit-relations";
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

	const [
		{ items: initialAssets },
		initialRelatedEntities,
		initialRelatedResources,
		unitRelationStatusOptions,
		institution,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getUnitRelationStatusOptions("institution"),
		db.query.organisationalUnits.findFirst({
			where: {
				type: { type: "institution" },
				entity: { slug },
			},
			columns: {
				id: true,
				name: true,
				summary: true,
			},
			with: {
				entity: {
					columns: {
						documentId: true,
						slug: true,
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

	const acronymRow = await db
		.select({ acronym: schema.organisationalUnits.acronym })
		.from(schema.organisationalUnits)
		.where(eq(schema.organisationalUnits.id, institution.id))
		.limit(1);

	const acronym = acronymRow.at(0)?.acronym ?? null;

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

	const descriptionRows = await db
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
				eq(schema.fields.entityId, institution.id),
				eq(schema.entityTypesFieldsNames.fieldName, "description"),
			),
		)
		.limit(1);

	const description = descriptionRows.at(0)?.content as JSONContent | undefined;

	const [{ relatedEntityIds, relatedResourceIds }, relations] = await Promise.all([
		getEntityRelations(institution.id),
		getUnitRelations(institution.id),
	]);

	const [selectedRelatedEntities, selectedRelatedResources] = await Promise.all([
		getEntityRelationOptionsByIds(relatedEntityIds),
		getResourceRelationOptionsByIds(relatedResourceIds),
	]);

	return (
		<InstitutionEditForm
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			institution={{ ...institution, acronym, description, image }}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			unitRelationStatusOptions={unitRelationStatusOptions}
		/>
	);
}
