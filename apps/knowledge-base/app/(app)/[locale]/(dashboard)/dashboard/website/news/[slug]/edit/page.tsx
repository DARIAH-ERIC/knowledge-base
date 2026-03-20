import { and, eq, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { NewsItemEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-item-edit";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEditNewsItemPageProps extends PageProps<"/[locale]/dashboard/website/news/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEditNewsItemPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit news item"),
	});

	return metadata;
}

export default async function DashboardWebsiteEditNewsItemPage(
	props: Readonly<DashboardWebsiteEditNewsItemPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const [{ items: assets }, newsItem] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions }),
		db.query.news.findFirst({
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
					with: {
						status: {
							columns: {
								id: true,
								type: true,
							},
						},
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
		}),
	]);

	if (newsItem == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: newsItem.image.key,
		options: imageGridOptions,
	});
	const richTextContentBlocks = await db
		.select({
			type: schema.contentBlockTypes.type,
			id: schema.richTextContentBlocks.id,
			content: sql<JSONContent | undefined>`${schema.richTextContentBlocks.content}`,
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
		.where(
			and(
				eq(schema.fields.entityId, newsItem.id),
				eq(schema.entityTypesFieldsNames.fieldName, "content"),
			),
		);

	return (
		<NewsItemEditForm
			assets={assets}
			contentBlocks={richTextContentBlocks}
			newsItem={{ ...newsItem, image: { key: newsItem.image.key, url: image.url } }}
		/>
	);
}
