"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { ContentBlocksView } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks-view";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { VersionSelector } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/version-selector";

interface PageItemDetailsProps {
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	pageItem: Pick<schema.Page, "id" | "title" | "summary"> & {
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } | null };
	publishAction: (documentId: string) => Promise<void>;
	discardDraftAction?: (documentId: string) => Promise<void>;
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
		selectedVersion,
	} = props;

	const t = useExtracted();

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
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{pageItem.title}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{pageItem.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{pageItem.summary}</DescriptionDetails>

				{pageItem.image != null ? (
					<Fragment>
						<DescriptionTerm>{t("Image")}</DescriptionTerm>
						<DescriptionDetails>
							<img alt="" src={pageItem.image.url} />
						</DescriptionDetails>
					</Fragment>
				) : null}

				<DescriptionTerm>{t("Content")}</DescriptionTerm>
				<DescriptionDetails>
					<ContentBlocksView contentBlocks={contentBlocks} />
				</DescriptionDetails>
			</DescriptionList>
		</Fragment>
	);
}
