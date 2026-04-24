import { and, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { WorkingGroupEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { getPersonOptions } from "@/lib/data/article-contributors";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import {
	getEntityRelationOptions,
	getEntityRelationOptionsByIds,
	getEntityRelations,
	getResourceRelationOptions,
	getResourceRelationOptionsByIds,
} from "@/lib/data/relations";
import { getUnitRelations, getUnitRelationStatusOptions } from "@/lib/data/unit-relations";
import { getWorkingGroupChairs } from "@/lib/data/working-group-chairs";
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

	const [
		{ items: initialAssets },
		initialRelatedEntities,
		initialRelatedResources,
		unitRelationStatusOptions,
		initialPersons,
		workingGroup,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getUnitRelationStatusOptions("working_group"),
		getPersonOptions(),
		db.query.organisationalUnits.findFirst({
			where: {
				type: { type: "working_group" },
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

	if (workingGroup == null) {
		notFound();
	}

	const acronymRow = await db
		.select({ acronym: schema.organisationalUnits.acronym })
		.from(schema.organisationalUnits)
		.where(eq(schema.organisationalUnits.id, workingGroup.id))
		.limit(1);

	const acronym = acronymRow.at(0)?.acronym ?? null;

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
				eq(schema.fields.entityId, workingGroup.id),
				eq(schema.entityTypesFieldsNames.fieldName, "description"),
			),
		)
		.limit(1);

	const description = descriptionRows.at(0)?.content as JSONContent | undefined;

	const [{ relatedEntityIds, relatedResourceIds }, relations, chairs] = await Promise.all([
		getEntityRelations(workingGroup.id),
		getUnitRelations(workingGroup.id),
		getWorkingGroupChairs(workingGroup.id),
	]);

	const [selectedRelatedEntities, selectedRelatedResources] = await Promise.all([
		getEntityRelationOptionsByIds(relatedEntityIds),
		getResourceRelationOptionsByIds(relatedResourceIds),
	]);

	return (
		<WorkingGroupEditForm
			chairs={chairs}
			initialAssets={initialAssets}
			initialPersonItems={initialPersons.items}
			initialPersonTotal={initialPersons.total}
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
			workingGroup={{ ...workingGroup, acronym, description, image }}
		/>
	);
}
