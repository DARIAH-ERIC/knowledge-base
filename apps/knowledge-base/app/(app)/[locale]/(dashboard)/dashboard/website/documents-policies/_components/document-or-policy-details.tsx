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

interface DocumentOrPolicyDetailsProps {
	contentBlocks: Array<ContentBlock>;
	documentOrPolicy: Pick<schema.DocumentOrPolicy, "id" | "title" | "summary" | "url"> & {
		entity: { documentId: string; slug: string };
	} & { document: { key: string; label: string; url: string } };
}

export function DocumentOrPolicyDetails(props: Readonly<DocumentOrPolicyDetailsProps>): ReactNode {
	const { contentBlocks, documentOrPolicy } = props;

	const t = useExtracted();

	return (
		<DescriptionList>
			<DescriptionTerm>{t("Title")}</DescriptionTerm>
			<DescriptionDetails>{documentOrPolicy.title}</DescriptionDetails>

			<DescriptionTerm>{t("Slug")}</DescriptionTerm>
			<DescriptionDetails>{documentOrPolicy.entity.slug}</DescriptionDetails>

			<DescriptionTerm>{t("Summary")}</DescriptionTerm>
			<DescriptionDetails>{documentOrPolicy.summary}</DescriptionDetails>

			{documentOrPolicy.url != null ? (
				<>
					<DescriptionTerm>{t("URL")}</DescriptionTerm>
					<DescriptionDetails>{documentOrPolicy.url}</DescriptionDetails>
				</>
			) : null}

			<DescriptionTerm>{t("Document")}</DescriptionTerm>
			<DescriptionDetails>{documentOrPolicy.document.label}</DescriptionDetails>

			<DescriptionTerm>{t("Content")}</DescriptionTerm>
			<DescriptionDetails>
				{contentBlocks.map((contentBlock) => {
					if (!contentBlock.content) return null;
					return (
						<div
							key={contentBlock.id}
							dangerouslySetInnerHTML={{
								__html: generateHTML(contentBlock.content, [StarterKit]),
							}}
						/>
					);
				})}
			</DescriptionDetails>
		</DescriptionList>
	);
}
