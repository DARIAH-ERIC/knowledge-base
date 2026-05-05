import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { OpportunityEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_components/opportunity-edit";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
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

	const opportunity = await db.query.opportunities.findFirst({
		where: {
			entityVersion: {
				entity: {
					slug,
				},
			},
		},
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
		},
	});

	if (opportunity == null) {
		notFound();
	}

	const contentBlocks = await getEntityContentBlocks(opportunity.id);
	const sources = await db.query.opportunitySources.findMany({
		orderBy: { source: "asc" },
		columns: { id: true, source: true },
	});

	return (
		<OpportunityEditForm
			contentBlocks={contentBlocks}
			opportunity={{ ...opportunity }}
			sources={sources}
		/>
	);
}
