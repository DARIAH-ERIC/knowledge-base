import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { FundingCallDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_components/funding-call-details";
import { discardFundingCallDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/discard-funding-call-draft.action";
import { publishFundingCallAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_lib/publish-funding-call.action";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { getDocumentVersions } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteFundingCallsDetailsPageProps extends PageProps<"/[locale]/dashboard/website/funding-calls/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteFundingCallsDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Funding call details"),
	});

	return metadata;
}

export default async function DashboardWebsiteFundingCallsDetailsPage(
	props: Readonly<DashboardWebsiteFundingCallsDetailsPageProps>,
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

	const { draftId, publishedId } = await db.transaction(async (tx) =>
		getDocumentVersions(tx, doc.id),
	);

	const { version } = await searchParamsPromise;
	const selectedVersion: "draft" | "published" =
		version === "published" && publishedId != null ? "published" : "draft";
	const versionId =
		selectedVersion === "published" && publishedId != null ? publishedId : (draftId ?? publishedId);
	if (versionId == null) {
		notFound();
	}

	const fundingCall = await db.query.fundingCalls.findFirst({
		where: { id: versionId },
		columns: {
			id: true,
			duration: true,
			title: true,
			summary: true,
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
		},
	});

	if (fundingCall == null) {
		notFound();
	}

	const contentBlocks = await getEntityContentBlocks(fundingCall.id);

	return (
		<FundingCallDetails
			contentBlocks={contentBlocks}
			discardDraftAction={discardFundingCallDraftAction}
			documentId={doc.id}
			fundingCall={{ ...fundingCall }}
			hasDraft={draftId != null}
			isPublished={publishedId != null}
			publishAction={publishFundingCallAction}
			selectedVersion={selectedVersion}
		/>
	);
}
