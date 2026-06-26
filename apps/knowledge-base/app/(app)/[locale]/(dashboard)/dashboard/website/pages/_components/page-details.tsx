"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { ContentBlocksView } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks-view";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { RelationTypeSuffix } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/relation-type-suffix";
import { VersionSelector } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/version-selector";

interface PageItemDetailsProps {
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	pageItem: Pick<schema.Page, "id" | "publicationDate" | "title" | "summary"> & {
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } | null };
	selectedRelatedEntities: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources: Array<{ id: string; name: string; description?: string }>;
	publishAction: (documentId: string) => Promise<unknown>;
	discardDraftAction?: (documentId: string) => Promise<unknown>;
}

export function PageItemDetails(props: Readonly<PageItemDetailsProps>): ReactNode {
	const {
		contentBlocks,
		documentId,
		hasDraft,
		isPublished,
		pageItem,
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
					draftHref={`/dashboard/website/pages/${pageItem.entityVersion.entity.slug}/details`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishedHref={`/dashboard/website/pages/${pageItem.entityVersion.entity.slug}/details?version=published`}
					selectedVersion={selectedVersion}
				/>
				<EntityLifecycleBar
					discardDraftAction={discardDraftAction}
					documentId={documentId}
					editHref={`/dashboard/website/pages/${pageItem.entityVersion.entity.slug}/edit`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishAction={publishAction}
				/>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Title")}</DescriptionTerm>
				<DescriptionDetails>{pageItem.title}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{pageItem.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{pageItem.summary}</DescriptionDetails>

				<DescriptionTerm>{t("Publication date")}</DescriptionTerm>
				<DescriptionDetails>
					{format.dateTime(pageItem.publicationDate, { dateStyle: "short", timeZone: "UTC" })}
				</DescriptionDetails>

				{pageItem.image != null ? (
					<Fragment>
						<DescriptionTerm>{t("Image")}</DescriptionTerm>
						<DescriptionDetails>
							<img
								alt=""
								className="block-24 inline-auto max-inline-full rounded-lg object-contain"
								src={pageItem.image.url}
							/>
						</DescriptionDetails>
					</Fragment>
				) : null}

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
