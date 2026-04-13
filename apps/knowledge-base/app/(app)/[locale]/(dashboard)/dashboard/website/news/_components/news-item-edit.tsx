"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { NewsItemForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-item-form";
import { updateNewsItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/update-news-item.action";

interface NewsItemEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	newsItem: Pick<schema.NewsItem, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
}

export function NewsItemEditForm(props: Readonly<NewsItemEditFormProps>): ReactNode {
	const { initialAssets, contentBlocks, newsItem } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit news item")}</Heading>

			<NewsItemForm
				contentBlocks={contentBlocks}
				formAction={updateNewsItemAction}
				initialAssets={initialAssets}
				newsItem={newsItem}
			/>
		</Fragment>
	);
}
