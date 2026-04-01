import { and, eq, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { DocumentOrPolicyEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/document-or-policy-edit";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEditDocumentOrPolicyPageProps extends PageProps<"/[locale]/dashboard/website/documents-policies/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEditDocumentOrPolicyPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Edit document or policy"),
	});

	return metadata;
}

export default async function DashboardWebsiteEditDocumentOrPolicyPage(
	props: Readonly<DashboardWebsiteEditDocumentOrPolicyPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const [{ items: assets }, documentOrPolicy] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "documents" }),
		db.query.documentsPolicies.findFirst({
			where: {
				entity: {
					slug,
				},
			},
			columns: {
				id: true,
				title: true,
				summary: true,
				url: true,
			},
			with: {
				entity: {
					columns: {
						documentId: true,
						slug: true,
					},
				},
				document: {
					columns: {
						key: true,
						label: true,
					},
				},
			},
		}),
	]);

	if (documentOrPolicy == null) {
		notFound();
	}

	const document = images.generateSignedImageUrl({
		key: documentOrPolicy.document.key,
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
				eq(schema.fields.entityId, documentOrPolicy.id),
				eq(schema.entityTypesFieldsNames.fieldName, "content"),
			),
		)
		.orderBy(schema.contentBlocks.position);

	return (
		<DocumentOrPolicyEditForm
			assets={assets}
			contentBlocks={richTextContentBlocks}
			documentOrPolicy={{
				...documentOrPolicy,
				document: { ...documentOrPolicy.document, url: document.url },
			}}
		/>
	);
}
