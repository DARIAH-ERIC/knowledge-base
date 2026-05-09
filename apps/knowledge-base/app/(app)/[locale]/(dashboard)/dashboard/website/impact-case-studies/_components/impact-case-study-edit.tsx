"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { ArticleContributorsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/_components/article-contributors-section";
import { ImpactCaseStudyForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_components/impact-case-study-form";
import { createImpactCaseStudyContributorAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/create-impact-case-study-contributor.action";
import { deleteImpactCaseStudyContributorAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/delete-impact-case-study-contributor.action";
import { discardImpactCaseStudyDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/discard-impact-case-study-draft.action";
import { publishImpactCaseStudyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/publish-impact-case-study.action";
import { updateImpactCaseStudyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/update-impact-case-study.action";
import type { AvailablePerson, ImpactCaseStudyContributor } from "@/lib/data/article-contributors";

interface ImpactCaseStudyEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	isPublished: boolean;
	impactCaseStudy: Pick<schema.ImpactCaseStudy, "id" | "title" | "summary"> & {
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } };
	initialRelatedEntityIds: Array<string>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds: Array<string>;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
	selectedRelatedEntities: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources: Array<{ id: string; name: string; description?: string }>;
	contributors: Array<ImpactCaseStudyContributor>;
	initialPersonItems: Array<AvailablePerson>;
	initialPersonTotal: number;
}

export function ImpactCaseStudyEditForm(props: Readonly<ImpactCaseStudyEditFormProps>): ReactNode {
	const {
		initialAssets,
		contentBlocks,
		documentId,
		isPublished,
		impactCaseStudy,
		initialRelatedEntityIds,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceIds,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		selectedRelatedEntities,
		selectedRelatedResources,
		contributors,
		initialPersonItems,
		initialPersonTotal,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<Heading>{t("Edit impact case study")}</Heading>
				<EntityLifecycleBar
					discardDraftAction={discardImpactCaseStudyDraftAction}
					documentId={documentId}
					hasDraft={true}
					isPublished={isPublished}
					publishAction={publishImpactCaseStudyAction}
				/>
			</div>

			<ImpactCaseStudyForm
				contentBlocks={contentBlocks}
				formAction={updateImpactCaseStudyAction}
				impactCaseStudy={impactCaseStudy}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedEntityItems={initialRelatedEntityItems}
				initialRelatedEntityTotal={initialRelatedEntityTotal}
				initialRelatedResourceIds={initialRelatedResourceIds}
				initialRelatedResourceItems={initialRelatedResourceItems}
				initialRelatedResourceTotal={initialRelatedResourceTotal}
				selectedRelatedEntities={selectedRelatedEntities}
				selectedRelatedResources={selectedRelatedResources}
			/>

			<ArticleContributorsSection
				articleId={impactCaseStudy.id}
				contributors={contributors}
				createAction={createImpactCaseStudyContributorAction}
				deleteAction={deleteImpactCaseStudyContributorAction}
				initialPersonItems={initialPersonItems}
				initialPersonTotal={initialPersonTotal}
			/>
		</Fragment>
	);
}
