import { db } from "@dariah-eric/database";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { SpotlightArticleEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_components/spotlight-article-edit";
import { imageGridOptions } from "@/config/assets.config";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { getPersonOptions, getSpotlightArticleContributors } from "@/lib/data/article-contributors";
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

interface DashboardWebsiteEditSpotlightArticlePageProps extends PageProps<"/[locale]/dashboard/website/spotlight-articles/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEditSpotlightArticlePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Edit spotlight article"),
	});

	return metadata;
}

export default async function DashboardWebsiteEditSpotlightArticlePage(
	props: Readonly<DashboardWebsiteEditSpotlightArticlePageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const [
		{ items: initialAssets },
		spotlightArticle,
		initialRelatedEntities,
		initialRelatedResources,
		initialPersons,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "images" }),
		db.query.spotlightArticles.findFirst({
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
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getPersonOptions(),
	]);

	if (spotlightArticle == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: spotlightArticle.image.key,
		options: imageGridOptions,
	});
	const [{ relatedEntityIds, relatedResourceIds }, contributors, contentBlocks] = await Promise.all(
		[
			getEntityRelations(spotlightArticle.id),
			getSpotlightArticleContributors(spotlightArticle.id),
			getEntityContentBlocks(spotlightArticle.id),
		],
	);

	const [selectedRelatedEntities, selectedRelatedResources] = await Promise.all([
		getEntityRelationOptionsByIds(relatedEntityIds),
		getResourceRelationOptionsByIds(relatedResourceIds),
	]);

	return (
		<SpotlightArticleEditForm
			contentBlocks={contentBlocks}
			contributors={contributors}
			initialAssets={initialAssets}
			initialPersonItems={initialPersons.items}
			initialPersonTotal={initialPersons.total}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			spotlightArticle={{
				...spotlightArticle,
				image: { ...spotlightArticle.image, url: image.url },
			}}
		/>
	);
}
