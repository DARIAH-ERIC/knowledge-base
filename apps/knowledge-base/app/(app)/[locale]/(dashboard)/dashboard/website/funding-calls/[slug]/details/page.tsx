import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { FundingCallDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_components/funding-call-details";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteFundingCallsDetailsPageProps extends PageProps<"/[locale]/dashboard/website/funding-calls/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteFundingCallsDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - FundingCalls details"),
	});

	return metadata;
}

export default async function DashboardWebsiteFundingCallsDetailsPage(
	props: Readonly<DashboardWebsiteFundingCallsDetailsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const fundingCall = await db.query.fundingCalls.findFirst({
		where: {
			entity: {
				slug,
			},
		},
		columns: {
			id: true,
			duration: true,
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
		},
	});

	if (fundingCall == null) {
		notFound();
	}

	const contentBlocks = await getEntityContentBlocks(fundingCall.id);

	return <FundingCallDetails contentBlocks={contentBlocks} fundingCall={{ ...fundingCall }} />;
}
