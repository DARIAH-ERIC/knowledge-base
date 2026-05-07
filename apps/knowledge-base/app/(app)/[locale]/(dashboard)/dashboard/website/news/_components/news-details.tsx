"use client";

import type * as schema from "@dariah-eric/database/schema";
import { buttonStyles } from "@dariah-eric/ui/button";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { Link } from "@dariah-eric/ui/link";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { ContentBlocksView } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks-view";

interface NewsItemDetailsProps {
	contentBlocks: Array<ContentBlock>;
	newsItem: Pick<schema.NewsItem, "id" | "title" | "summary"> & {
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } };
}

export function NewsItemDetails(props: Readonly<NewsItemDetailsProps>): ReactNode {
	const { contentBlocks, newsItem } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex justify-end">
				<Link
					className={buttonStyles({ intent: "secondary", size: "sm" })}
					href={`/dashboard/website/news/${newsItem.entityVersion.entity.slug}/edit`}
				>
					<PencilSquareIcon className="mr-2 size-4" />
					{t("Edit")}
				</Link>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{newsItem.title}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{newsItem.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{newsItem.summary}</DescriptionDetails>

				<DescriptionTerm>{t("Image")}</DescriptionTerm>
				<DescriptionDetails>
					<img alt="" src={newsItem.image.url} />
				</DescriptionDetails>

				<DescriptionTerm>{t("Content")}</DescriptionTerm>
				<DescriptionDetails>
					<ContentBlocksView contentBlocks={contentBlocks} />
				</DescriptionDetails>
			</DescriptionList>
		</Fragment>
	);
}
