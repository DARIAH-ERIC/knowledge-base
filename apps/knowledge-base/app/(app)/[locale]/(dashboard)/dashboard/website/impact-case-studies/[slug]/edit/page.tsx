import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ImpactCaseStudyEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_components/impact-case-study-edit";
import { imageGridOptions } from "@/config/assets.config";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import {
	getAvailablePersons,
	getImpactCaseStudyContributors,
} from "@/lib/data/article-contributors";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import {
	getAvailableEntities,
	getAvailableResources,
	getEntityRelations,
} from "@/lib/data/relations";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEditImpactCaseStudyPageProps extends PageProps<"/[locale]/dashboard/website/impact-case-studies/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEditImpactCaseStudyPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Edit impact case study"),
	});

	return metadata;
}

export default async function DashboardWebsiteEditImpactCaseStudyPage(
	props: Readonly<DashboardWebsiteEditImpactCaseStudyPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const [
		{ items: initialAssets },
		impactCaseStudy,
		relatedEntities,
		relatedResources,
		availablePersons,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "images" }),
		db.query.impactCaseStudies.findFirst({
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
		}),
		getAvailableEntities(),
		getAvailableResources(),
		getAvailablePersons(),
	]);

	if (impactCaseStudy == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: impactCaseStudy.image.key,
		options: imageGridOptions,
	});
	const [{ relatedEntityIds, relatedResourceIds }, contributors, contentBlocks] = await Promise.all(
		[
			getEntityRelations(impactCaseStudy.id),
			getImpactCaseStudyContributors(impactCaseStudy.id),
			getEntityContentBlocks(impactCaseStudy.id),
		],
	);

	return (
		<ImpactCaseStudyEditForm
			availablePersons={availablePersons}
			contentBlocks={contentBlocks}
			contributors={contributors}
			impactCaseStudy={{
				...impactCaseStudy,
				image: { ...impactCaseStudy.image, url: image.url },
			}}
			initialAssets={initialAssets}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedResourceIds={relatedResourceIds}
			relatedEntities={relatedEntities}
			relatedResources={relatedResources}
		/>
	);
}
