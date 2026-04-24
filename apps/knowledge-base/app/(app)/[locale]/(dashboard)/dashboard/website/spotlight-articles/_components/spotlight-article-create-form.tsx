"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { SpotlightArticleForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_components/spotlight-article-form";
import { createSpotlightArticleAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_lib/create-spotlight-article.action";

interface SpotlightArticleCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
}

export function SpotlightArticleCreateForm(
	props: Readonly<SpotlightArticleCreateFormProps>,
): ReactNode {
	const {
		initialAssets,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New spotlight article")}</Heading>

			<SpotlightArticleForm
				formAction={createSpotlightArticleAction}
				initialAssets={initialAssets}
				initialRelatedEntityItems={initialRelatedEntityItems}
				initialRelatedEntityTotal={initialRelatedEntityTotal}
				initialRelatedResourceItems={initialRelatedResourceItems}
				initialRelatedResourceTotal={initialRelatedResourceTotal}
			/>
		</Fragment>
	);
}
