"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { generateHTML } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";

interface SpotlightArticleDetailsProps {
	contentBlocks: Array<ContentBlock>;
	spotlightArticle: Pick<schema.SpotlightArticle, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
}

export function SpotlightArticleDetails(props: Readonly<SpotlightArticleDetailsProps>): ReactNode {
	const { contentBlocks, spotlightArticle } = props;

	const t = useExtracted();

	return (
		<DescriptionList>
			<DescriptionTerm>{t("Name")}</DescriptionTerm>
			<DescriptionDetails>{spotlightArticle.title}</DescriptionDetails>

			<DescriptionTerm>{t("Slug")}</DescriptionTerm>
			<DescriptionDetails>{spotlightArticle.entity.slug}</DescriptionDetails>

			<DescriptionTerm>{t("Summary")}</DescriptionTerm>
			<DescriptionDetails>{spotlightArticle.summary}</DescriptionDetails>

			<DescriptionTerm>{t("Image")}</DescriptionTerm>
			<DescriptionDetails>
				<img alt="" src={spotlightArticle.image.url} />
			</DescriptionDetails>

			<DescriptionTerm>{t("Content")}</DescriptionTerm>
			<DescriptionDetails>
				{contentBlocks.map((contentBlock) => {
					if (!contentBlock.content) return null;
					return (
						<div
							key={contentBlock.id}
							dangerouslySetInnerHTML={{
								__html: contentBlocks.map((contentBlock) => {
									return generateHTML(contentBlock.content!, [StarterKit]);
								}),
							}}
						/>
					);
				})}
			</DescriptionDetails>
		</DescriptionList>
	);
}
