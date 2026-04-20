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
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
	initialRelatedEntityIds: Array<string>;
	initialRelatedResourceIds: Array<string>;
	contributors: Array<SpotlightArticleContributor>;
	availablePersons: Array<AvailablePerson>;
}

export function SpotlightArticleEditForm(
	props: Readonly<SpotlightArticleEditFormProps>,
): ReactNode {
	const {
		initialAssets,
		contentBlocks,
		spotlightArticle,
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
			<Heading>{t("Edit spotlight article")}</Heading>

			<SpotlightArticleForm
				contentBlocks={contentBlocks}
				formAction={updateSpotlightArticleAction}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedResourceIds={initialRelatedResourceIds}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
				spotlightArticle={spotlightArticle}
			/>

			<ArticleContributorsSection
				articleId={spotlightArticle.id}
				availablePersons={availablePersons}
				contributors={contributors}
				createAction={createSpotlightArticleContributorAction}
				deleteAction={deleteSpotlightArticleContributorAction}
			/>
		</Fragment>
	);
}
