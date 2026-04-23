"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { ArticleContributorsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/_components/article-contributors-section";
import { ImpactCaseStudyForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_components/impact-case-study-form";
import { createImpactCaseStudyContributorAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/create-impact-case-study-contributor.action";
import { deleteImpactCaseStudyContributorAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/delete-impact-case-study-contributor.action";
import { updateImpactCaseStudyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/impact-case-studies/_lib/update-impact-case-study.action";
import type { AvailablePerson, ImpactCaseStudyContributor } from "@/lib/data/article-contributors";

interface ImpactCaseStudyEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	impactCaseStudy: Pick<schema.ImpactCaseStudy, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
	initialRelatedEntityIds: Array<string>;
	initialRelatedResourceIds: Array<string>;
	contributors: Array<ImpactCaseStudyContributor>;
	availablePersons: Array<AvailablePerson>;
}

export function ImpactCaseStudyEditForm(props: Readonly<ImpactCaseStudyEditFormProps>): ReactNode {
	const {
		initialAssets,
		contentBlocks,
		impactCaseStudy,
		relatedEntities,
		relatedResources,
		initialRelatedEntityIds,
		initialRelatedResourceIds,
		contributors,
		availablePersons,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit impact case study")}</Heading>

			<ImpactCaseStudyForm
				contentBlocks={contentBlocks}
				formAction={updateImpactCaseStudyAction}
				impactCaseStudy={impactCaseStudy}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedResourceIds={initialRelatedResourceIds}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
			/>

			<ArticleContributorsSection
				articleId={impactCaseStudy.id}
				availablePersons={availablePersons}
				contributors={contributors}
				createAction={createImpactCaseStudyContributorAction}
				deleteAction={deleteImpactCaseStudyContributorAction}
			/>
		</Fragment>
	);
}
