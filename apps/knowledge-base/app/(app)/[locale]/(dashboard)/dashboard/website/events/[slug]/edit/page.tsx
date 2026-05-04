import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { EventEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/event-edit";
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
import { db } from "@/lib/db";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEditEventPageProps extends PageProps<"/[locale]/dashboard/website/events/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEditEventPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit event"),
	});

	return metadata;
}

export default async function DashboardWebsiteEditEventPage(
	props: Readonly<DashboardWebsiteEditEventPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const [{ items: initialAssets }, event, initialRelatedEntities, initialRelatedResources] =
		await Promise.all([
			getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "images" }),
			db.query.events.findFirst({
				where: {
					entityVersion: {
						entity: {
							slug,
						},
					},
				},
				columns: {
					id: true,
					duration: true,
					location: true,
					title: true,
					summary: true,
					website: true,
				},
				with: {
					entityVersion: {
						columns: { id: true },
						with: {
							entity: {
								columns: {
									id: true,
									slug: true,
								},
							},
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

	if (event == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: event.image.key,
		options: imageGridOptions,
	});

	const contentBlocks = await getEntityContentBlocks(event.id);

	const documentId = event.entityVersion.entity.id;
	const { relatedEntityIds, relatedResourceIds } = await getEntityRelations(documentId);

	const [selectedRelatedEntities, selectedRelatedResources] = await Promise.all([
		getEntityRelationOptionsByIds(relatedEntityIds),
		getResourceRelationOptionsByIds(relatedResourceIds),
	]);

	return (
		<EventEditForm
			contentBlocks={contentBlocks}
			event={{ ...event, image: { ...event.image, url: image.url } }}
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
		/>
	);
}
