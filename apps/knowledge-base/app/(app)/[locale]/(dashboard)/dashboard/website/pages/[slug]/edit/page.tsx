import { and, eq, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { PageItemEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_components/page-item-edit";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import {
	getAvailableEntities,
	getAvailableResources,
	getEntityRelations,
} from "@/lib/data/relations";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEditPageItemPageProps extends PageProps<"/[locale]/dashboard/website/pages/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEditPageItemPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Edit page"),
	});

	return metadata;
}

export default async function DashboardWebsiteEditPageItemPage(
	props: Readonly<DashboardWebsiteEditPageItemPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const [{ items: initialAssets }, pageItem, relatedEntities, relatedResources] = await Promise.all(
		[
			getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "images" }),
			db.query.pages.findFirst({
				where: {
					entity: {
						slug,
					},
				},
				columns: {
					id: true,
					title: true,
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
			getAvailableEntities(),
			getAvailableResources(),
		],
	);

	if (pageItem == null) {
		notFound();
	}

	const { relatedEntityIds, relatedResourceIds } = await getEntityRelations(pageItem.id);

	const image = pageItem.image
		? images.generateSignedImageUrl({
				key: pageItem.image.key,
				options: imageGridOptions,
			})
		: null;

	const contentBlocksWhere = and(
		eq(schema.fields.entityId, pageItem.id),
		eq(schema.entityTypesFieldsNames.fieldName, "content"),
	);

	const [
		richTextContentBlocks,
		imageContentBlockRows,
		embedContentBlockRows,
		dataContentBlockRows,
		heroContentBlockRows,
		accordionContentBlockRows,
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
		db
			.select({
				id: schema.heroContentBlocks.id,
				position: schema.contentBlocks.position,
				type: schema.contentBlockTypes.type,
				title: schema.heroContentBlocks.title,
				eyebrow: schema.heroContentBlocks.eyebrow,
				imageKey: schema.assets.key,
				ctas: schema.heroContentBlocks.ctas,
			})
			.from(schema.heroContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.heroContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(
				schema.contentBlockTypes,
				eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
			)
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.leftJoin(schema.assets, eq(schema.heroContentBlocks.imageId, schema.assets.id))
			.where(contentBlocksWhere)
			.orderBy(schema.contentBlocks.position),
		db
			.select({
				id: schema.accordionContentBlocks.id,
				position: schema.contentBlocks.position,
				type: schema.contentBlockTypes.type,
				items: schema.accordionContentBlocks.items,
			})
			.from(schema.accordionContentBlocks)
			.innerJoin(
				schema.contentBlocks,
				eq(schema.accordionContentBlocks.id, schema.contentBlocks.id),
			)
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

	const heroContentBlocks = heroContentBlockRows.map((row) => {
		const imageUrl =
			row.imageKey != null
				? images.generateSignedImageUrl({ key: row.imageKey, options: imageGridOptions }).url
				: undefined;
		return {
			id: row.id,
			position: row.position,
			type: "hero" as const,
			content: {
				title: row.title,
				eyebrow: row.eyebrow ?? undefined,
				imageKey: row.imageKey ?? undefined,
				imageUrl,
				ctas: (row.ctas as Array<{ label: string; url: string }> | undefined) ?? undefined,
			},
		};
	});

	const accordionContentBlocks = accordionContentBlockRows.map((row) => {
		return {
			id: row.id,
			position: row.position,
			type: "accordion" as const,
			content: {
				items: row.items as Array<{ title: string; content?: JSONContent }> | undefined,
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
		...heroContentBlocks,
		...accordionContentBlocks,
	].sort((a, b) => {
		return a.position - b.position;
	});

	return (
		<PageItemEditForm
			contentBlocks={contentBlocks}
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedResourceIds={relatedResourceIds}
			pageItem={{
				...pageItem,
				image: pageItem.image ? { ...pageItem.image, url: image!.url } : null,
			}}
			relatedEntities={relatedEntities}
			relatedResources={relatedResources}
		/>
	);
}
