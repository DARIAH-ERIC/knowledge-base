import { and, eq, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { SpotlightArticleDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_components/spotlight-article-details";
import { imageGridOptions } from "@/config/assets.config";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteSpotlightArticleDetailsPageProps extends PageProps<"/[locale]/dashboard/website/spotlight-articles/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteSpotlightArticleDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Spotlight article details"),
	});

	return metadata;
}

export default async function DashboardWebsiteSpotlightArticleDetailsPage(
	props: Readonly<DashboardWebsiteSpotlightArticleDetailsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const spotlightArticle = await db.query.spotlightArticles.findFirst({
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
	});

	if (spotlightArticle == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: spotlightArticle.image.key,
		options: imageGridOptions,
	});

	const richTextContentBlocks = await db
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
		.where(
			and(
				eq(schema.fields.entityId, spotlightArticle.id),
				eq(schema.entityTypesFieldsNames.fieldName, "content"),
			),
		)
		.orderBy(schema.contentBlocks.position);

	return (
		<SpotlightArticleDetails
			contentBlocks={richTextContentBlocks.map((row) => {
				return { ...row, type: "rich_text" as const };
			})}
			spotlightArticle={{
				...spotlightArticle,
				image: { ...spotlightArticle.image, url: image.url },
			}}
		/>
	);
}
