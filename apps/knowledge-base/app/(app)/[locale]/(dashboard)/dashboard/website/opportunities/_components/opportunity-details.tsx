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
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { FeaturedImageDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/featured-image-details";
import { RelationTypeSuffix } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/relation-type-suffix";
import { VersionSelector } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/version-selector";
import { ContentBlocksView } from "@/components/content-blocks-view";

interface OpportunityDetailsProps {
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	opportunity: Pick<
		schema.Opportunity,
		"id" | "duration" | "title" | "summary" | "website" | "imageCaption" | "imageCaptionMode"
	> & {
		entityVersion: { entity: { id: string; slug: string } };
		source: { id: string; source: string };
	} & {
		image: SelectedImage;
	};
	publishAction: (documentId: string) => Promise<unknown>;
	selectedRelatedEntities: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources: Array<{ id: string; name: string; description?: string }>;
	discardDraftAction?: (documentId: string) => Promise<unknown>;
}

export function OpportunityDetails(props: Readonly<OpportunityDetailsProps>): ReactNode {
	const {
		contentBlocks,
		documentId,
		hasDraft,
		isPublished,
		opportunity,
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
					draftHref={`/dashboard/website/opportunities/${opportunity.entityVersion.entity.slug}/details`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishedHref={`/dashboard/website/opportunities/${opportunity.entityVersion.entity.slug}/details?version=published`}
					selectedVersion={selectedVersion}
				/>
				<EntityLifecycleBar
					discardDraftAction={discardDraftAction}
					documentId={documentId}
					editHref={`/dashboard/website/opportunities/${opportunity.entityVersion.entity.slug}/edit`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishAction={publishAction}
				/>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Title")}</DescriptionTerm>
				<DescriptionDetails>{opportunity.title}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{opportunity.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Source")}</DescriptionTerm>
				<DescriptionDetails>{opportunity.source.source}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{opportunity.summary}</DescriptionDetails>

				<DescriptionTerm>{t("Duration")}</DescriptionTerm>
				<DescriptionDetails>
					{opportunity.duration.end
						? format.dateTimeRange(opportunity.duration.start, opportunity.duration.end, {
								dateStyle: "short",
							})
						: format.dateTime(opportunity.duration.start, { dateStyle: "short" })}
				</DescriptionDetails>

				<DescriptionTerm>{t("Website")}</DescriptionTerm>
				<DescriptionDetails>{opportunity.website}</DescriptionDetails>

				<DescriptionTerm>{t("Image")}</DescriptionTerm>
				<DescriptionDetails>
					<FeaturedImageDetails
						image={opportunity.image}
						imageCaption={opportunity.imageCaption}
						imageCaptionMode={opportunity.imageCaptionMode}
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
									<span className="font-medium">{relatedEntity.name}</span>
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
