"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { SelectedImage } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/asset-summary";
import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { ContentBlocksView } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks-view";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { FeaturedImageDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/featured-image-details";
import { RelationLink } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/relation-link";
import { RelationTypeSuffix } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/relation-type-suffix";
import { VersionSelector } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/version-selector";
import { getEntityDetailHref } from "@/lib/entity-detail-href";

interface NewsItemDetailsProps {
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	newsItem: Pick<
		schema.NewsItem,
		"id" | "publicationDate" | "title" | "summary" | "imageCaption" | "imageCaptionMode"
	> & {
		entityVersion: { entity: { id: string; slug: string } };
	} & {
		image: SelectedImage;
	};
	publishAction: (documentId: string) => Promise<unknown>;
	selectedRelatedEntities: Array<{
		id: string;
		name: string;
		description?: string;
		slug: string;
		entityType: string;
		unitType: string | null;
	}>;
	selectedRelatedResources: Array<{ id: string; name: string; description?: string }>;
	discardDraftAction?: (documentId: string) => Promise<unknown>;
}

export function NewsItemDetails(props: Readonly<NewsItemDetailsProps>): ReactNode {
	const {
		contentBlocks,
		documentId,
		hasDraft,
		isPublished,
		newsItem,
		publishAction,
		discardDraftAction,
		selectedRelatedEntities,
		selectedRelatedResources,
		selectedVersion,
	} = props;

	const t = useExtracted();
	const format = useFormatter();

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<VersionSelector
					draftHref={`/dashboard/website/news/${newsItem.entityVersion.entity.slug}/details`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishedHref={`/dashboard/website/news/${newsItem.entityVersion.entity.slug}/details?version=published`}
					selectedVersion={selectedVersion}
				/>
				<EntityLifecycleBar
					discardDraftAction={discardDraftAction}
					documentId={documentId}
					editHref={`/dashboard/website/news/${newsItem.entityVersion.entity.slug}/edit`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishAction={publishAction}
				/>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Title")}</DescriptionTerm>
				<DescriptionDetails>{newsItem.title}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{newsItem.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{newsItem.summary}</DescriptionDetails>

				<DescriptionTerm>{t("Publication date")}</DescriptionTerm>
				<DescriptionDetails>
					{format.dateTime(newsItem.publicationDate, { dateStyle: "short", timeZone: "UTC" })}
				</DescriptionDetails>

				<DescriptionTerm>{t("Image")}</DescriptionTerm>
				<DescriptionDetails>
					<FeaturedImageDetails
						image={newsItem.image}
						imageCaption={newsItem.imageCaption}
						imageCaptionMode={newsItem.imageCaptionMode}
					/>
				</DescriptionDetails>

				<DescriptionTerm>{t("Content")}</DescriptionTerm>
				<DescriptionDetails>
					<ContentBlocksView contentBlocks={contentBlocks} />
				</DescriptionDetails>

				<DescriptionTerm>{t("Related entities")}</DescriptionTerm>
				<DescriptionDetails>
					{selectedRelatedEntities.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{selectedRelatedEntities.map((relatedEntity) => (
								<li key={relatedEntity.id} className="text-sm">
									<RelationLink
										className="font-medium"
										href={getEntityDetailHref({
											entityType: relatedEntity.entityType,
											slug: relatedEntity.slug,
											unitType: relatedEntity.unitType,
										})}
									>
										{relatedEntity.name}
									</RelationLink>
									<RelationTypeSuffix type={relatedEntity.description} />
								</li>
							))}
						</ul>
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Related resources")}</DescriptionTerm>
				<DescriptionDetails>
					{selectedRelatedResources.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{selectedRelatedResources.map((relatedResource) => (
								<li key={relatedResource.id} className="text-sm">
									<span className="font-medium">{relatedResource.name}</span>
									<RelationTypeSuffix type={relatedResource.description} />
								</li>
							))}
						</ul>
					) : null}
				</DescriptionDetails>
			</DescriptionList>
		</Fragment>
	);
}
