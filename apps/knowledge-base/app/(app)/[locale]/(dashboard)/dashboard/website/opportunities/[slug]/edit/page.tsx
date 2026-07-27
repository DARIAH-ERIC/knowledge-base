import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { OpportunityEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_components/opportunity-edit";
import { imageGridOptions } from "@/config/assets.config";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { ensureDraftVersion, getDocumentLifecycleState } from "@/lib/data/entity-lifecycle";
import { opportunitiesLifecycleAdapter } from "@/lib/data/opportunities.lifecycle-adapter";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEditOpportunityPageProps extends PageProps<"/[locale]/dashboard/website/opportunities/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEditOpportunityPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit opportunity"),
	});

	return metadata;
}

export default async function DashboardWebsiteEditOpportunityPage(
	props: Readonly<DashboardWebsiteEditOpportunityPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const anyVersion = await db.query.opportunities.findFirst({
		where: { entityVersion: { entity: { slug } } },
		columns: {},
		with: {
			entityVersion: {
				columns: {},
				with: { entity: { columns: { id: true } } },
			},
		},
	});

	if (anyVersion == null) {
		notFound();
	}

	const documentId = anyVersion.entityVersion.entity.id;

	const { draftVersionId, hasDraftChanges, publishedId } = await db.transaction(async (tx) => {
		const draftVersionId = await ensureDraftVersion(tx, documentId, opportunitiesLifecycleAdapter);
		const { hasDraftChanges, publishedId } = await getDocumentLifecycleState(tx, documentId);
		return { draftVersionId, hasDraftChanges, publishedId };
	});

	const opportunity = await db.query.opportunities.findFirst({
		where: { id: draftVersionId },
		columns: {
			id: true,
			duration: true,
			sourceId: true,
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
			source: {
				columns: {
					id: true,
					source: true,
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

	if (opportunity == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: opportunity.image.key,
		options: imageGridOptions,
	});

	const [contentBlocks, sources, { items: initialAssets }] = await Promise.all([
		getEntityContentBlocks(opportunity.id, "content"),
		db.query.opportunitySources.findMany({
			orderBy: { source: "asc" },
			columns: { id: true, source: true },
		}),
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "images" }),
	]);

	return (
		<OpportunityEditForm
			contentBlocks={contentBlocks}
			documentId={documentId}
			hasDraftChanges={hasDraftChanges}
			initialAssets={initialAssets}
			isPublished={publishedId != null}
			opportunity={{ ...opportunity, image: { ...opportunity.image, url: image.url } }}
			sources={sources}
		/>
	);
}
