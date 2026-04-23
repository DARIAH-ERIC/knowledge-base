import { and, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CountryEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_components/country-edit-form";
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

interface DashboardAdministratorEditCountryPageProps {
	params: Promise<{ locale: string; slug: string }>;
}

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

	const [
		{ items: initialAssets },
		relatedEntities,
		relatedResources,
		allowedRelationOptions,
		country,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getAvailableEntities(),
		getAvailableResources(),
		getUnitRelationOptions("country"),
		db.query.organisationalUnits.findFirst({
			where: {
				type: { type: "country" },
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

	if (country == null) {
		notFound();
	}

	const acronymRow = await db
		.select({ acronym: schema.organisationalUnits.acronym })
		.from(schema.organisationalUnits)
		.where(eq(schema.organisationalUnits.id, country.id))
		.limit(1);

	const acronym = acronymRow.at(0)?.acronym ?? null;

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
				eq(schema.fields.entityId, country.id),
				eq(schema.entityTypesFieldsNames.fieldName, "description"),
			),
		)
		.limit(1);

	const description = descriptionRows.at(0)?.content as JSONContent | undefined;

	const [{ relatedEntityIds, relatedResourceIds }, relations] = await Promise.all([
		getEntityRelations(country.id),
		getUnitRelations(country.id),
	]);

	return (
		<CountryEditForm
			allowedRelationOptions={allowedRelationOptions}
			country={{ ...country, acronym, description, image }}
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedResourceIds={relatedResourceIds}
			relatedEntities={relatedEntities}
			relatedResources={relatedResources}
			relations={relations}
		/>
	);
}
