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

interface OpportunityDetailsProps {
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	opportunity: Pick<schema.Opportunity, "id" | "duration" | "title" | "summary" | "website"> & {
		entityVersion: { entity: { id: string; slug: string } };
	};
	publishAction: (documentId: string) => Promise<void>;
	discardDraftAction?: (documentId: string) => Promise<void>;
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
		selectedVersion,
	} = props;

	const t = useExtracted();

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
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{opportunity.title}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{opportunity.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{opportunity.summary}</DescriptionDetails>

				<DescriptionTerm>{t("Content")}</DescriptionTerm>
				<DescriptionDetails>
					<ContentBlocksView contentBlocks={contentBlocks} />
				</DescriptionDetails>
			</DescriptionList>
		</Fragment>
	);
}
