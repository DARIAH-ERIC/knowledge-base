"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { SpotlightArticleForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_components/spotlight-article-form";
import { createSpotlightArticleAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/spotlight-articles/_lib/create-spotlight-article.action";

interface SpotlightArticleCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
}

export function SpotlightArticleCreateForm(
	props: Readonly<SpotlightArticleCreateFormProps>,
): ReactNode {
	const { initialAssets } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New spotlight article")}</Heading>

			<SpotlightArticleForm
				formAction={createSpotlightArticleAction}
				initialAssets={initialAssets}
			/>
		</Fragment>
	);
}
