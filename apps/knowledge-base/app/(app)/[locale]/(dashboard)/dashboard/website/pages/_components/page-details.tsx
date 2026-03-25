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
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";

interface PageItemDetailsProps {
	contentBlocks: Array<ContentBlock>;
	pageItem: Pick<schema.Page, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } | null };
}

export function PageItemDetails(props: Readonly<PageItemDetailsProps>): ReactNode {
	const { contentBlocks, pageItem } = props;

	const t = useExtracted();

	return (
		<DescriptionList>
			<DescriptionTerm>{t("Name")}</DescriptionTerm>
			<DescriptionDetails>{pageItem.title}</DescriptionDetails>

			<DescriptionTerm>{t("Slug")}</DescriptionTerm>
			<DescriptionDetails>{pageItem.entity.slug}</DescriptionDetails>

			<DescriptionTerm>{t("Summary")}</DescriptionTerm>
			<DescriptionDetails>{pageItem.summary}</DescriptionDetails>

			{pageItem.image != null ? (
				<Fragment>
					<DescriptionTerm>{t("Image")}</DescriptionTerm>
					<DescriptionDetails>
						<img alt="" src={pageItem.image.url} />
					</DescriptionDetails>
				</Fragment>
			) : null}

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
