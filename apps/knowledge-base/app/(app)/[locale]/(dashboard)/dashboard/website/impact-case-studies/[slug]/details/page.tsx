import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ImpactCaseStudyDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_components/impact-case-study-details";
import { imageGridOptions } from "@/config/assets.config";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { db } from "@/lib/db";
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

	const contentBlocks = await getEntityContentBlocks(impactCaseStudy.id);

	return (
		<ImpactCaseStudyDetails
			contentBlocks={contentBlocks}
			impactCaseStudy={{
				...impactCaseStudy,
				image: { ...impactCaseStudy.image, url: image.url },
			}}
		/>
	);
}
