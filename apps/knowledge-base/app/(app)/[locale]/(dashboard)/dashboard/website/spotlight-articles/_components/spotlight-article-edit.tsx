"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { SpotlightArticleForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_components/spotlight-article-form";
import { updateSpotlightArticleAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_lib/update-spotlight-article.action";

interface SpotlightArticleEditFormProps {
	assets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	spotlightArticle: Pick<schema.SpotlightArticle, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
}

export function SpotlightArticleEditForm(
	props: Readonly<SpotlightArticleEditFormProps>,
): ReactNode {
	const { assets, contentBlocks, spotlightArticle } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit spotlight article")}</Heading>

			<SpotlightArticleForm
				assets={assets}
				contentBlocks={contentBlocks}
				formAction={updateSpotlightArticleAction}
				spotlightArticle={spotlightArticle}
			/>
		</Fragment>
	);
}
