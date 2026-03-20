import { and, eq, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { EventEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/event-edit";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
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

	const [{ items: assets }, event] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions }),
		db.query.events.findFirst({
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

	if (event == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: event.image.key,
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
				eq(schema.fields.entityId, event.id),
				eq(schema.entityTypesFieldsNames.fieldName, "content"),
			),
		);

	return (
		<EventEditForm
			assets={assets}
			contentBlocks={richTextContentBlocks}
			event={{ ...event, image: { key: event.image.key, url: image.url } }}
		/>
	);
}
