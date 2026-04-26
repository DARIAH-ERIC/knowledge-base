"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { ArticleContributorsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/_components/article-contributors-section";
import { SpotlightArticleForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_components/spotlight-article-form";
import { createSpotlightArticleContributorAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_lib/create-spotlight-article-contributor.action";
import { deleteSpotlightArticleContributorAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_lib/delete-spotlight-article-contributor.action";
import { updateSpotlightArticleAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_lib/update-spotlight-article.action";
import type { AvailablePerson, SpotlightArticleContributor } from "@/lib/data/article-contributors";

interface SpotlightArticleEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	spotlightArticle: Pick<schema.SpotlightArticle, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
	initialRelatedEntityIds: Array<string>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds: Array<string>;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
	selectedRelatedEntities: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources: Array<{ id: string; name: string; description?: string }>;
	contributors: Array<SpotlightArticleContributor>;
	initialPersonItems: Array<AvailablePerson>;
	initialPersonTotal: number;
}

export function SpotlightArticleEditForm(
	props: Readonly<SpotlightArticleEditFormProps>,
): ReactNode {
	const {
		initialAssets,
		contentBlocks,
		spotlightArticle,
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
			<Heading>{t("Edit spotlight article")}</Heading>

			<SpotlightArticleForm
				contentBlocks={contentBlocks}
				formAction={updateSpotlightArticleAction}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedEntityItems={initialRelatedEntityItems}
				initialRelatedEntityTotal={initialRelatedEntityTotal}
				initialRelatedResourceIds={initialRelatedResourceIds}
				initialRelatedResourceItems={initialRelatedResourceItems}
				initialRelatedResourceTotal={initialRelatedResourceTotal}
				selectedRelatedEntities={selectedRelatedEntities}
				selectedRelatedResources={selectedRelatedResources}
				spotlightArticle={spotlightArticle}
			/>

			<ArticleContributorsSection
				articleId={spotlightArticle.id}
				contributors={contributors}
				createAction={createSpotlightArticleContributorAction}
				deleteAction={deleteSpotlightArticleContributorAction}
				initialPersonItems={initialPersonItems}
				initialPersonTotal={initialPersonTotal}
			/>
		</Fragment>
	);
}
