import { and, eq, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { EventDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/event-details";
import { imageGridOptions } from "@/config/assets.config";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEventDetailsPageProps extends PageProps<"/[locale]/dashboard/website/events/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEventDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Event details"),
	});

	return metadata;
}

export default async function DashboardWebsiteEventDetailsPage(
	props: Readonly<DashboardWebsiteEventDetailsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const event = await db.query.events.findFirst({
		where: {
			entity: {
				slug,
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
	});

	if (event == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: event.image.key,
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
				eq(schema.fields.entityId, event.id),
				eq(schema.entityTypesFieldsNames.fieldName, "content"),
			),
		)
		.orderBy(schema.contentBlocks.position);

	return (
		<EventDetails
			contentBlocks={richTextContentBlocks}
			event={{ ...event, image: { ...event.image, url: image.url } }}
		/>
	);
}
