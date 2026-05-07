import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { FundingCallEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/funding-calls/_components/funding-call-edit";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEditFundingCallPageProps extends PageProps<"/[locale]/dashboard/website/funding-calls/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEditFundingCallPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit funding call"),
	});

	return metadata;
}

export default async function DashboardWebsiteEditFundingCallPage(
	props: Readonly<DashboardWebsiteEditFundingCallPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const fundingCall = await db.query.fundingCalls.findFirst({
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

	return <FundingCallEditForm contentBlocks={contentBlocks} fundingCall={{ ...fundingCall }} />;
}
