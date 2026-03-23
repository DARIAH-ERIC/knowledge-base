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

interface EventDetailsProps {
	contentBlocks: Array<ContentBlock>;
	event: Pick<schema.Event, "id" | "duration" | "location" | "title" | "summary" | "website"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; url: string } };
}

export function EventDetails(props: Readonly<EventDetailsProps>): ReactNode {
	const { contentBlocks, event } = props;

	const t = useExtracted();

	return (
		<DescriptionList>
			<DescriptionTerm>{t("Name")}</DescriptionTerm>
			<DescriptionDetails>{event.title}</DescriptionDetails>

			<DescriptionTerm>{t("Slug")}</DescriptionTerm>
			<DescriptionDetails>{event.entity.slug}</DescriptionDetails>

			<DescriptionTerm>{t("Summary")}</DescriptionTerm>
			<DescriptionDetails>{event.summary}</DescriptionDetails>

			<DescriptionTerm>{t("Image")}</DescriptionTerm>
			<DescriptionDetails>
				<img alt="" src={event.image.url} />
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
