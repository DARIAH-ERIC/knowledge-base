import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { OpportunityDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_components/opportunity-details";
import { discardOpportunityDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_lib/discard-opportunity-draft.action";
import { publishOpportunityAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_lib/publish-opportunity.action";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { getDocumentVersions } from "@/lib/data/entity-lifecycle";
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

	const doc = await db.query.entities.findFirst({
		where: { slug },
		columns: { id: true },
	});

	if (doc == null) {
		notFound();
	}

	const { draftId, publishedId } = await db.transaction(async (tx) => getDocumentVersions(tx, doc.id));

	const { version } = await searchParamsPromise;
	const selectedVersion: "draft" | "published" =
		version === "published" && publishedId != null ? "published" : "draft";
	const versionId =
		selectedVersion === "published" && publishedId != null ? publishedId : (draftId ?? publishedId);
	if (versionId == null) {
		notFound();
	}

	const opportunity = await db.query.opportunities.findFirst({
		where: { id: versionId },
		columns: {
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
		},
	});

	if (opportunity == null) {
		notFound();
	}

	const contentBlocks = await getEntityContentBlocks(opportunity.id);

	return (
		<OpportunityDetails
			contentBlocks={contentBlocks}
			discardDraftAction={discardOpportunityDraftAction}
			documentId={doc.id}
			hasDraft={draftId != null}
			isPublished={publishedId != null}
			opportunity={{ ...opportunity }}
			publishAction={publishOpportunityAction}
			selectedVersion={selectedVersion}
		/>
	);
}
