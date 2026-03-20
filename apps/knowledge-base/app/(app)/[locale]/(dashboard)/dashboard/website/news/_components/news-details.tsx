"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

interface NewsItemDetailsProps {
	newsItem: Pick<schema.NewsItem, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; url: string } };
}

export function NewsItemDetails(props: Readonly<NewsItemDetailsProps>): ReactNode {
	const { newsItem } = props;

	const t = useExtracted();

	return (
		<DescriptionList>
			<DescriptionTerm>{t("Name")}</DescriptionTerm>
			<DescriptionDetails>{newsItem.title}</DescriptionDetails>

			<DescriptionTerm>{t("Slug")}</DescriptionTerm>
			<DescriptionDetails>{newsItem.entity.slug}</DescriptionDetails>

			<DescriptionTerm>{t("Summary")}</DescriptionTerm>
			<DescriptionDetails>{newsItem.summary}</DescriptionDetails>

			<DescriptionTerm>{t("Image")}</DescriptionTerm>
			<DescriptionDetails>
				<img alt="" src={newsItem.image.url} />
			</DescriptionDetails>
		</DescriptionList>
	);
}
