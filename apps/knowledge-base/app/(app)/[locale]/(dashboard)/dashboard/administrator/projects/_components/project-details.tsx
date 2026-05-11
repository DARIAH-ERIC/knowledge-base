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
import { Fragment, type ReactNode } from "react";

import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { VersionSelector } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/version-selector";

interface ProjectDetailsProps {
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	project: Pick<
		schema.Project,
		"acronym" | "call" | "duration" | "funding" | "id" | "name" | "summary" | "topic"
	> & {
		description: JSONContent | null;
		entityVersion: {
			entity: Pick<schema.Entity, "id" | "slug">;
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
	publishAction: (documentId: string) => Promise<void>;
	discardDraftAction?: (documentId: string) => Promise<void>;
}

export function ProjectDetails(props: Readonly<ProjectDetailsProps>): ReactNode {
	const {
		documentId,
		hasDraft,
		isPublished,
		project,
		publishAction,
		discardDraftAction,
		selectedVersion,
	} = props;

	const t = useExtracted();
	const format = useFormatter();

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<VersionSelector
					draftHref={`/dashboard/administrator/projects/${project.entityVersion.entity.slug}/details`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishedHref={`/dashboard/administrator/projects/${project.entityVersion.entity.slug}/details?version=published`}
					selectedVersion={selectedVersion}
				/>
				<EntityLifecycleBar
					discardDraftAction={discardDraftAction}
					documentId={documentId}
					editHref={`/dashboard/administrator/projects/${project.entityVersion.entity.slug}/edit`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishAction={publishAction}
				/>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{project.name}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{project.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Acronym")}</DescriptionTerm>
				<DescriptionDetails>{project.acronym}</DescriptionDetails>

				<DescriptionTerm>{t("Duration")}</DescriptionTerm>
				<DescriptionDetails>
					{project.duration.end
						? format.dateTimeRange(project.duration.start, project.duration.end, {
								dateStyle: "short",
							})
						: format.dateTime(project.duration.start, { dateStyle: "short" })}
				</DescriptionDetails>

				<DescriptionTerm>{t("Scope")}</DescriptionTerm>
				<DescriptionDetails>{project.scope.scope}</DescriptionDetails>

				<DescriptionTerm>{t("Funding")}</DescriptionTerm>
				<DescriptionDetails>
					{project.funding != null
						? format.number(project.funding, { style: "currency", currency: "EUR" })
						: null}
				</DescriptionDetails>

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
													? format.dateTimeRange(partner.duration.start, partner.duration.end, {
															dateStyle: "short",
														})
													: format.dateTime(partner.duration.start, { dateStyle: "short" })}
											</span>
										) : null}
									</li>
								);
							})}
						</ul>
					) : null}
				</DescriptionDetails>
			</DescriptionList>
		</Fragment>
	);
}
