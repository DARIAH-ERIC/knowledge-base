"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { NewsItemForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-item-form";
import { createNewsItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/create-news-item.action";

interface NewsItemCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
}

export function NewsItemCreateForm(props: Readonly<NewsItemCreateFormProps>): ReactNode {
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
			<Heading>{t("New news item")}</Heading>

			<NewsItemForm
				formAction={createNewsItemAction}
				initialAssets={initialAssets}
				initialRelatedEntityItems={initialRelatedEntityItems}
				initialRelatedEntityTotal={initialRelatedEntityTotal}
				initialRelatedResourceItems={initialRelatedResourceItems}
				initialRelatedResourceTotal={initialRelatedResourceTotal}
			/>
		</Fragment>
	);
}
