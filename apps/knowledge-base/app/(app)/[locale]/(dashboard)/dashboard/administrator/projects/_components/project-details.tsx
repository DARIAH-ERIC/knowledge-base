"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { RichTextRenderer } from "@dariah-eric/ui/rich-text-editor";
import type { JSONContent } from "@tiptap/core";
import { useExtracted, useFormatter } from "next-intl";
import type { ReactNode } from "react";

interface ProjectDetailsProps {
	project: Pick<
		schema.Project,
		"acronym" | "call" | "duration" | "funders" | "funding" | "id" | "name" | "summary" | "topic"
	> & {
		description: JSONContent | null;
		entity: Pick<schema.Entity, "documentId" | "slug"> & {
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
		scope: Pick<schema.ProjectScope, "id" | "scope">;
		partners: Array<{
			id: string;
			unitName: string;
			roleName: string;
			duration: { start: Date; end?: Date | null | undefined } | null;
		}>;
		socialMedia: Array<{
			id: string;
			name: string;
			url: string;
			type: { type: string };
		}>;
	} & { image: { key: string; label: string; url: string } | null };
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

			<DescriptionTerm>{t("Scope")}</DescriptionTerm>
			<DescriptionDetails>{project.scope.scope}</DescriptionDetails>

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

			<DescriptionTerm>{t("Description")}</DescriptionTerm>
			<DescriptionDetails>
				{project.description != null ? <RichTextRenderer content={project.description} /> : null}
			</DescriptionDetails>

			<DescriptionTerm>{t("Social media")}</DescriptionTerm>
			<DescriptionDetails>
				{project.socialMedia.length > 0 ? (
					<ul className="flex flex-col gap-1">
						{project.socialMedia.map((item) => {
							return (
								<li key={item.id} className="text-sm">
									<span className="font-medium">{item.name}</span>
									{" · "}
									<span className="text-muted-fg">{item.type.type}</span>
									{" · "}
									<a className="underline" href={item.url} rel="noreferrer" target="_blank">
										{item.url}
									</a>
								</li>
							);
						})}
					</ul>
				) : null}
			</DescriptionDetails>

			<DescriptionTerm>{t("Partners")}</DescriptionTerm>
			<DescriptionDetails>
				{project.partners.length > 0 ? (
					<ul className="flex flex-col gap-1">
						{project.partners.map((partner) => {
							return (
								<li key={partner.id} className="text-sm">
									<span className="font-medium">{partner.unitName}</span>
									{" · "}
									<span className="text-muted-fg">{partner.roleName}</span>
									{partner.duration != null ? (
										<span className="text-muted-fg">
											{" · "}
											{partner.duration.end
												? format.dateTimeRange(partner.duration.start, partner.duration.end)
												: format.dateTime(partner.duration.start)}
										</span>
									) : null}
								</li>
							);
						})}
					</ul>
				) : null}
			</DescriptionDetails>
		</DescriptionList>
	);
}
