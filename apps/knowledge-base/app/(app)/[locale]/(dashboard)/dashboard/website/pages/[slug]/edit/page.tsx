import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { PageItemEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_components/page-item-edit";
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

	const [{ items: initialAssets }, pageItem, initialRelatedEntities, initialRelatedResources] =
		await Promise.all([
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
			getEntityRelationOptions(),
			getResourceRelationOptions(),
		]);

	if (pageItem == null) {
		notFound();
	}

	const { relatedEntityIds, relatedResourceIds } = await getEntityRelations(pageItem.id);

	const [selectedRelatedEntities, selectedRelatedResources] = await Promise.all([
		getEntityRelationOptionsByIds(relatedEntityIds),
		getResourceRelationOptionsByIds(relatedResourceIds),
	]);

	const image = pageItem.image
		? images.generateSignedImageUrl({
				key: pageItem.image.key,
				options: imageGridOptions,
			})
		: null;

	const contentBlocks = await getEntityContentBlocks(pageItem.id);

	return (
		<PageItemEditForm
			contentBlocks={contentBlocks}
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			pageItem={{
				...pageItem,
				image: pageItem.image ? { ...pageItem.image, url: image!.url } : null,
			}}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
		/>
	);
}
