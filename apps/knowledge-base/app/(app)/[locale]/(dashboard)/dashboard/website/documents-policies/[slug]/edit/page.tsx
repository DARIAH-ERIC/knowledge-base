import { and, eq, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { DocumentOrPolicyEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/document-or-policy-edit";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEditDocumentOrPolicyPageProps extends PageProps<"/[locale]/dashboard/website/documents-policies/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEditDocumentOrPolicyPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Edit document or policy"),
	});

	return metadata;
}

export default async function DashboardWebsiteEditDocumentOrPolicyPage(
	props: Readonly<DashboardWebsiteEditDocumentOrPolicyPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const [{ items: initialAssets }, documentOrPolicy] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "documents" }),
		db.query.documentsPolicies.findFirst({
			where: {
				entity: {
					slug,
				},
			},
			columns: {
				id: true,
				title: true,
				summary: true,
				url: true,
			},
			with: {
				entity: {
					columns: {
						documentId: true,
						slug: true,
					},
				},
				document: {
					columns: {
						key: true,
						label: true,
					},
				},
			},
		}),
	]);

	if (documentOrPolicy == null) {
		notFound();
	}

	const document = images.generateSignedImageUrl({
		key: documentOrPolicy.document.key,
		options: imageGridOptions,
	});

	const contentBlocksWhere = and(
		eq(schema.fields.entityId, documentOrPolicy.id),
		eq(schema.entityTypesFieldsNames.fieldName, "content"),
	);

	const [
		richTextContentBlocks,
		imageContentBlockRows,
		embedContentBlockRows,
		dataContentBlockRows,
	] = await Promise.all([
		db
			.select({
				id: schema.richTextContentBlocks.id,
				content: sql<JSONContent | undefined>`${schema.richTextContentBlocks.content}`,
				position: schema.contentBlocks.position,
				type: schema.contentBlockTypes.type,
			})
			.from(schema.richTextContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(
				schema.contentBlockTypes,
				eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
			)
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(contentBlocksWhere)
			.orderBy(schema.contentBlocks.position),
		db
			.select({
				id: schema.imageContentBlocks.id,
				position: schema.contentBlocks.position,
				type: schema.contentBlockTypes.type,
				imageKey: schema.assets.key,
				caption: schema.imageContentBlocks.caption,
			})
			.from(schema.imageContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.imageContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(
				schema.contentBlockTypes,
				eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
			)
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.innerJoin(schema.assets, eq(schema.imageContentBlocks.imageId, schema.assets.id))
			.where(contentBlocksWhere)
			.orderBy(schema.contentBlocks.position),
		db
			.select({
				id: schema.embedContentBlocks.id,
				position: schema.contentBlocks.position,
				type: schema.contentBlockTypes.type,
				url: schema.embedContentBlocks.url,
				title: schema.embedContentBlocks.title,
				caption: schema.embedContentBlocks.caption,
			})
			.from(schema.embedContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.embedContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(
				schema.contentBlockTypes,
				eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
			)
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(contentBlocksWhere)
			.orderBy(schema.contentBlocks.position),
		db
			.select({
				id: schema.dataContentBlocks.id,
				position: schema.contentBlocks.position,
				type: schema.contentBlockTypes.type,
				dataType: schema.dataContentBlockTypes.type,
				limit: schema.dataContentBlocks.limit,
				selectedIds: schema.dataContentBlocks.selectedIds,
			})
			.from(schema.dataContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.dataContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(
				schema.contentBlockTypes,
				eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
			)
			.innerJoin(
				schema.dataContentBlockTypes,
				eq(schema.dataContentBlocks.typeId, schema.dataContentBlockTypes.id),
			)
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(contentBlocksWhere)
			.orderBy(schema.contentBlocks.position),
	]);

	const imageContentBlocks = imageContentBlockRows.map((row) => {
		const { url: imageUrl } = images.generateSignedImageUrl({
			key: row.imageKey,
			options: imageGridOptions,
		});
		return {
			id: row.id,
			position: row.position,
			type: "image" as const,
			content: { imageKey: row.imageKey, imageUrl, caption: row.caption ?? undefined },
		};
	});

	const embedContentBlocks = embedContentBlockRows.map((row) => {
		return {
			id: row.id,
			position: row.position,
			type: "embed" as const,
			content: { url: row.url, title: row.title, caption: row.caption ?? undefined },
		};
	});

	const dataContentBlocks = dataContentBlockRows.map((row) => {
		return {
			id: row.id,
			position: row.position,
			type: "data" as const,
			content: {
				dataType: row.dataType,
				limit: row.limit ?? undefined,
				selectedIds: (row.selectedIds as Array<string> | undefined) ?? undefined,
			},
		};
	});

	const contentBlocks = [
		...richTextContentBlocks.map((row) => {
			return { ...row, type: "rich_text" as const };
		}),
		...imageContentBlocks,
		...embedContentBlocks,
		...dataContentBlocks,
	].sort((a, b) => {
		return a.position - b.position;
	});

	return (
		<DocumentOrPolicyEditForm
			contentBlocks={contentBlocks}
			documentOrPolicy={{
				...documentOrPolicy,
				document: { ...documentOrPolicy.document, url: document.url },
			}}
			initialAssets={initialAssets}
		/>
	);
}
