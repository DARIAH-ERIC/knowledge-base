import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { OpportunityDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_components/opportunity-details";
import { discardOpportunityDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_lib/discard-opportunity-draft.action";
import { publishOpportunityAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_lib/publish-opportunity.action";
import { imageGridOptions } from "@/config/assets.config";
import { getResolvedEntityContentBlocks } from "@/lib/content-blocks-service";
import { getDocumentLifecycleState } from "@/lib/data/entity-lifecycle";
import {
	getEntityRelationOptionsByIds,
	getEntityRelations,
	getResourceRelationOptionsByIds,
} from "@/lib/data/relations";
import {
	selectedImageColumns,
	selectedImageWith,
	toSelectedImage,
} from "@/lib/data/selected-image";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteOpportunitiesDetailsPageProps extends PageProps<"/[locale]/dashboard/website/opportunities/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteOpportunitiesDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Opportunity details"),
	});

	return metadata;
}

export default async function DashboardWebsiteOpportunitiesDetailsPage(
	props: Readonly<DashboardWebsiteOpportunitiesDetailsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams: searchParamsPromise } = props;

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

	const doc = { id: anyVersion.entityVersion.entity.id };

	const { draftId, publishedId, hasDraftChanges } = await db.transaction(async (tx) =>
		getDocumentLifecycleState(tx, doc.id),
	);

	/**
	 * The version selector and "with draft changes" UX only kick in when the draft actually diverges
	 * from the published version. Right after publish, a draft row still exists as a clone of the new
	 * published version but has no real changes — we treat that as published-only.
	 */
	const showVersionSelector = hasDraftChanges && publishedId != null && draftId != null;

	const { version } = await searchParamsPromise;
	let selectedVersion: "draft" | "published";
	let versionId: string | null;

	if (showVersionSelector) {
		selectedVersion = version === "published" ? "published" : "draft";
		versionId = selectedVersion === "published" ? publishedId : draftId;
	} else if (publishedId != null) {
		selectedVersion = "published";
		versionId = publishedId;
	} else {
		selectedVersion = "draft";
		versionId = draftId;
	}

	if (versionId == null) {
		notFound();
	}

	const opportunity = await db.query.opportunities.findFirst({
		where: { id: versionId },
		columns: {
			imageCaption: true,
			imageCaptionMode: true,
			id: true,
			duration: true,
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
				columns: selectedImageColumns,
				with: selectedImageWith,
			},
		},
	});

	if (opportunity == null) {
		notFound();
	}

	const image = toSelectedImage(opportunity.image, imageGridOptions);

	const contentBlocks = await getResolvedEntityContentBlocks(opportunity.id, "content");

	const { relatedEntityIds, relatedResourceIds } = await getEntityRelations(doc.id);

	const [selectedRelatedEntities, selectedRelatedResources] = await Promise.all([
		getEntityRelationOptionsByIds(relatedEntityIds),
		getResourceRelationOptionsByIds(relatedResourceIds),
	]);

	return (
		<OpportunityDetails
			contentBlocks={contentBlocks}
			discardDraftAction={discardOpportunityDraftAction}
			documentId={doc.id}
			hasDraft={hasDraftChanges}
			isPublished={publishedId != null}
			opportunity={{ ...opportunity, image }}
			publishAction={publishOpportunityAction}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			selectedVersion={selectedVersion}
		/>
	);
}
