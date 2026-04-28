import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { NationalConsortiumEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortium-edit-form";
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
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
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

	const [
		{ items: initialAssets },
		initialRelatedEntities,
		initialRelatedResources,
		unitRelationStatusOptions,
		nationalConsortium,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getUnitRelationStatusOptions("national_consortium"),
		db.query.organisationalUnits.findFirst({
			where: {
				type: { type: "national_consortium" },
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

	if (nationalConsortium == null) {
		notFound();
	}

	const acronymRow = await db
		.select({ acronym: schema.organisationalUnits.acronym })
		.from(schema.organisationalUnits)
		.where(eq(schema.organisationalUnits.id, nationalConsortium.id))
		.limit(1);

	const acronym = acronymRow.at(0)?.acronym ?? null;

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
				eq(schema.fields.entityId, nationalConsortium.id),
				eq(schema.entityTypesFieldsNames.fieldName, "description"),
			),
		)
		.limit(1);

	const description = descriptionRows.at(0)?.content;

	const [{ relatedEntityIds, relatedResourceIds }, relations] = await Promise.all([
		getEntityRelations(nationalConsortium.id),
		getUnitRelations(nationalConsortium.id),
	]);

	const [selectedRelatedEntities, selectedRelatedResources] = await Promise.all([
		getEntityRelationOptionsByIds(relatedEntityIds),
		getResourceRelationOptionsByIds(relatedResourceIds),
	]);

	return (
		<NationalConsortiumEditForm
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			nationalConsortium={{ ...nationalConsortium, acronym, description, image }}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			unitRelationStatusOptions={unitRelationStatusOptions}
		/>
	);
}
