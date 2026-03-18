"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { useExtracted, useFormatter } from "next-intl";
import type { ReactNode } from "react";

interface ProjectDetailsProps {
	project: Pick<
		schema.Project,
		"acronym" | "call" | "duration" | "funders" | "funding" | "id" | "name" | "summary" | "topic"
	> & {
		entity: Pick<schema.Entity, "documentId" | "slug"> & {
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
		scope: Pick<schema.ProjectScope, "id" | "scope">;
	} & { image: { key: string; url: string } | null };
}

export function ProjectDetails(props: Readonly<ProjectDetailsProps>): ReactNode {
	const { project } = props;

	const t = useExtracted();
	const format = useFormatter();

	return (
		<DescriptionList>
			<DescriptionTerm>{t("Name")}</DescriptionTerm>
			<DescriptionDetails>{project.name}</DescriptionDetails>

			<DescriptionTerm>{t("Slug")}</DescriptionTerm>
			<DescriptionDetails>{project.entity.slug}</DescriptionDetails>

			<DescriptionTerm>{t("Acronym")}</DescriptionTerm>
			<DescriptionDetails>{project.acronym}</DescriptionDetails>

			<DescriptionTerm>{t("Duration")}</DescriptionTerm>
			<DescriptionDetails>
				{project.duration.end
					? format.dateTimeRange(project.duration.start, project.duration.end)
					: format.dateTime(project.duration.start)}
			</DescriptionDetails>

			<DescriptionTerm>{t("Funding")}</DescriptionTerm>
			<DescriptionDetails>{project.funding}</DescriptionDetails>

			<DescriptionTerm>{t("Funders")}</DescriptionTerm>
			<DescriptionDetails>{project.funders}</DescriptionDetails>

			<DescriptionTerm>{t("Call")}</DescriptionTerm>
			<DescriptionDetails>{project.call}</DescriptionDetails>

			<DescriptionTerm>{t("Topic")}</DescriptionTerm>
			<DescriptionDetails>{project.topic}</DescriptionDetails>

			<DescriptionTerm>{t("Image")}</DescriptionTerm>
			<DescriptionDetails>
				{project.image ? (
					<img alt="" className="size-24 rounded-lg object-cover" src={project.image.url} />
				) : null}
			</DescriptionDetails>

			<DescriptionTerm>{t("Summary")}</DescriptionTerm>
			<DescriptionDetails>{project.summary}</DescriptionDetails>
		</DescriptionList>
	);
}
