import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { OpportunityDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_components/opportunity-details";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteOpportunitiesDetailsPageProps extends PageProps<"/[locale]/dashboard/website/opportunities/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteOpportunitiesDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Opportunities details"),
	});

	return metadata;
}

export default async function DashboardWebsiteOpportunitiesDetailsPage(
	props: Readonly<DashboardWebsiteOpportunitiesDetailsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const opportunity = await db.query.opportunities.findFirst({
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

	return <OpportunityDetails contentBlocks={contentBlocks} opportunity={{ ...opportunity }} />;
}
