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

interface ImpactCaseStudyDetailsProps {
	contentBlocks: Array<ContentBlock>;
	impactCaseStudy: Pick<schema.ImpactCaseStudy, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
}

export function ImpactCaseStudyDetails(props: Readonly<ImpactCaseStudyDetailsProps>): ReactNode {
	const { contentBlocks, impactCaseStudy } = props;

	const t = useExtracted();

	return (
		<DescriptionList>
			<DescriptionTerm>{t("Name")}</DescriptionTerm>
			<DescriptionDetails>{impactCaseStudy.title}</DescriptionDetails>

			<DescriptionTerm>{t("Slug")}</DescriptionTerm>
			<DescriptionDetails>{impactCaseStudy.entity.slug}</DescriptionDetails>

			<DescriptionTerm>{t("Summary")}</DescriptionTerm>
			<DescriptionDetails>{impactCaseStudy.summary}</DescriptionDetails>

			<DescriptionTerm>{t("Image")}</DescriptionTerm>
			<DescriptionDetails>
				<img alt="" src={impactCaseStudy.image.url} />
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
