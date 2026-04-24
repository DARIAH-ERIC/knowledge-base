import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { NewsItemEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-item-edit";
import { imageGridOptions } from "@/config/assets.config";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import {
	getEntityRelationOptions,
	getEntityRelationOptionsByIds,
	getEntityRelations,
	getResourceRelationOptions,
	getResourceRelationOptionsByIds,
} from "@/lib/data/relations";
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

	const [{ items: initialAssets }, newsItem, initialRelatedEntities, initialRelatedResources] =
		await Promise.all([
			getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "images" }),
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
							label: true,
						},
					},
				},
			}),
			getEntityRelationOptions(),
			getResourceRelationOptions(),
		]);

	if (newsItem == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: newsItem.image.key,
		options: imageGridOptions,
	});
	const contentBlocks = await getEntityContentBlocks(newsItem.id);

	const { relatedEntityIds, relatedResourceIds } = await getEntityRelations(newsItem.id);

	const [selectedRelatedEntities, selectedRelatedResources] = await Promise.all([
		getEntityRelationOptionsByIds(relatedEntityIds),
		getResourceRelationOptionsByIds(relatedResourceIds),
	]);

	return (
		<NewsItemEditForm
			contentBlocks={contentBlocks}
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			newsItem={{ ...newsItem, image: { ...newsItem.image, url: image.url } }}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
		/>
	);
}
