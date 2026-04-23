import { and, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { GovernanceBodyEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_components/governance-body-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import {
	getAvailableEntities,
	getAvailableResources,
	getEntityRelations,
} from "@/lib/data/relations";
import { getUnitRelationOptions, getUnitRelations } from "@/lib/data/unit-relations";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditGovernanceBodyPageProps {
	params: Promise<{ locale: string; slug: string }>;
}

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

	const [
		{ items: initialAssets },
		relatedEntities,
		relatedResources,
		allowedRelationOptions,
		governanceBody,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getAvailableEntities(),
		getAvailableResources(),
		getUnitRelationOptions("governance_body"),
		db.query.organisationalUnits.findFirst({
			where: {
				type: { type: "governance_body" },
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

	if (governanceBody == null) {
		notFound();
	}

	const acronymRow = await db
		.select({ acronym: schema.organisationalUnits.acronym })
		.from(schema.organisationalUnits)
		.where(eq(schema.organisationalUnits.id, governanceBody.id))
		.limit(1);

	const acronym = acronymRow.at(0)?.acronym ?? null;

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
				eq(schema.fields.entityId, governanceBody.id),
				eq(schema.entityTypesFieldsNames.fieldName, "description"),
			),
		)
		.limit(1);

	const description = descriptionRows.at(0)?.content as JSONContent | undefined;

	const [{ relatedEntityIds, relatedResourceIds }, relations] = await Promise.all([
		getEntityRelations(governanceBody.id),
		getUnitRelations(governanceBody.id),
	]);

	return (
		<GovernanceBodyEditForm
			allowedRelationOptions={allowedRelationOptions}
			governanceBody={{ ...governanceBody, acronym, description, image }}
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedResourceIds={relatedResourceIds}
			relatedEntities={relatedEntities}
			relatedResources={relatedResources}
			relations={relations}
		/>
	);
}
