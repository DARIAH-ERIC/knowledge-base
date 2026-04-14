import { and, eq, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ImpactCaseStudyDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_components/impact-case-study-details";
import { imageGridOptions } from "@/config/assets.config";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteImpactCaseStudyDetailsPageProps extends PageProps<"/[locale]/dashboard/website/impact-case-studies/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteImpactCaseStudyDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Impact case study details"),
	});

	return metadata;
}

export default async function DashboardWebsiteImpactCaseStudyDetailsPage(
	props: Readonly<DashboardWebsiteImpactCaseStudyDetailsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const impactCaseStudy = await db.query.impactCaseStudies.findFirst({
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

	if (impactCaseStudy == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: impactCaseStudy.image.key,
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
				eq(schema.fields.entityId, impactCaseStudy.id),
				eq(schema.entityTypesFieldsNames.fieldName, "content"),
			),
		)
		.orderBy(schema.contentBlocks.position);

	return (
		<ImpactCaseStudyDetails
			contentBlocks={richTextContentBlocks.map((row) => {
				return { ...row, type: "rich_text" as const };
			})}
			impactCaseStudy={{
				...impactCaseStudy,
				image: { ...impactCaseStudy.image, url: image.url },
			}}
		/>
	);
}
