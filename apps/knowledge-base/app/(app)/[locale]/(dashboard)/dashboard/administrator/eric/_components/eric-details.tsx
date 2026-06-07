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
import { RelationLink } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/relation-link";
import { VersionSelector } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/version-selector";
import {
	type EricReverseRelationGroups,
	type EricReverseRelationSourceType,
	ericReverseRelationSourceTypes,
} from "@/lib/data/eric";
import { getEntityDetailHref, getOrganisationalUnitDetailHref } from "@/lib/entity-detail-href";
import { formatRoleType } from "@/lib/format-role-type";

interface EricDetailsProps {
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	eric: Pick<
		schema.OrganisationalUnit,
		"acronym" | "id" | "name" | "sshocMarketplaceActorId" | "summary"
	> & {
		description: JSONContent | null;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } | null };
	selectedRelatedEntities: Array<{
		id: string;
		name: string;
		description?: string;
		slug: string;
		entityType: string;
		unitType: string | null;
	}>;
	selectedRelatedResources: Array<{ id: string; name: string; description?: string }>;
	selectedSocialMediaItems: Array<{
		id: string;
		name: string;
		type?: string;
		url?: string;
		description?: string;
	}>;
	reverseRelationGroups: EricReverseRelationGroups;
	publishAction: (documentId: string) => Promise<unknown>;
	discardDraftAction?: (documentId: string) => Promise<unknown>;
}

export function EricDetails(props: Readonly<EricDetailsProps>): ReactNode {
	const {
		documentId,
		hasDraft,
		isPublished,
		eric,
		reverseRelationGroups,
		publishAction,
		discardDraftAction,
		selectedRelatedEntities,
		selectedRelatedResources,
		selectedSocialMediaItems,
		selectedVersion,
	} = props;

	const t = useExtracted();
	const format = useFormatter();

	const slug = eric.entityVersion.entity.slug;

	const groupLabels: Record<EricReverseRelationSourceType, string> = {
		country: t("Countries"),
		institution: t("Institutions"),
		working_group: t("Working groups"),
		governance_body: t("Governance bodies"),
	};

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<VersionSelector
					draftHref={`/dashboard/administrator/eric/${slug}/details`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishedHref={`/dashboard/administrator/eric/${slug}/details?version=published`}
					selectedVersion={selectedVersion}
				/>
				<EntityLifecycleBar
					discardDraftAction={discardDraftAction}
					documentId={documentId}
					editHref={`/dashboard/administrator/eric/${slug}/edit`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishAction={publishAction}
				/>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{eric.name}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{slug}</DescriptionDetails>

				<DescriptionTerm>{t("Acronym")}</DescriptionTerm>
				<DescriptionDetails>{eric.acronym}</DescriptionDetails>

				<DescriptionTerm>{t("SSHOC actor ID")}</DescriptionTerm>
				<DescriptionDetails>{eric.sshocMarketplaceActorId}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{eric.summary}</DescriptionDetails>

				<DescriptionTerm>{t("Image")}</DescriptionTerm>
				<DescriptionDetails>
					{eric.image != null ? (
						<img
							alt=""
							className="block-24 inline-auto max-inline-full rounded-lg object-cover"
							src={eric.image.url}
						/>
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Description")}</DescriptionTerm>
				<DescriptionDetails>
					{eric.description != null ? (
						<RichTextRenderer key={selectedVersion} content={eric.description} />
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Social Media")}</DescriptionTerm>
				<DescriptionDetails>
					{selectedSocialMediaItems.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{selectedSocialMediaItems.map((socialMediaItem) => (
								<li key={socialMediaItem.id} className="text-sm">
									<span className="font-medium">{socialMediaItem.name}</span>
									{socialMediaItem.type != null ? (
										<Fragment>
											{" · "}
											<span className="text-muted-fg">{socialMediaItem.type}</span>
										</Fragment>
									) : null}
									{socialMediaItem.url != null ? (
										<Fragment>
											{" · "}
											<a
												className="underline"
												href={socialMediaItem.url}
												rel="noreferrer"
												target="_blank"
											>
												{socialMediaItem.url}
											</a>
										</Fragment>
									) : null}
								</li>
							))}
						</ul>
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Related entities")}</DescriptionTerm>
				<DescriptionDetails>
					{selectedRelatedEntities.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{selectedRelatedEntities.map((relatedEntity) => (
								<li key={relatedEntity.id} className="text-sm">
									<RelationLink
										className="font-medium"
										href={getEntityDetailHref({
											entityType: relatedEntity.entityType,
											slug: relatedEntity.slug,
											unitType: relatedEntity.unitType,
										})}
									>
										{relatedEntity.name}
									</RelationLink>
								</li>
							))}
						</ul>
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Related resources")}</DescriptionTerm>
				<DescriptionDetails>
					{selectedRelatedResources.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{selectedRelatedResources.map((relatedResource) => (
								<li key={relatedResource.id} className="text-sm">
									<span className="font-medium">{relatedResource.name}</span>
								</li>
							))}
						</ul>
					) : null}
				</DescriptionDetails>

				{ericReverseRelationSourceTypes.map((sourceUnitType) => {
					const { relations } = reverseRelationGroups[sourceUnitType];

					return (
						<Fragment key={sourceUnitType}>
							<DescriptionTerm>{groupLabels[sourceUnitType]}</DescriptionTerm>
							<DescriptionDetails>
								{relations.length > 0 ? (
									<ul className="flex flex-col gap-1">
										{relations.map((relation) => (
											<li key={relation.id} className="text-sm">
												<span className="font-medium">{formatRoleType(relation.statusType)}</span>
												{" · "}
												<RelationLink
													className="text-muted-fg"
													href={getOrganisationalUnitDetailHref(
														relation.unitType,
														relation.unitSlug,
													)}
												>
													{relation.unitName}
												</RelationLink>
												<span className="text-muted-fg">
													{" · "}
													{relation.duration.end
														? format.dateTimeRange(relation.duration.start, relation.duration.end, {
																dateStyle: "short",
															})
														: format.dateTime(relation.duration.start, { dateStyle: "short" })}
												</span>
											</li>
										))}
									</ul>
								) : null}
							</DescriptionDetails>
						</Fragment>
					);
				})}
			</DescriptionList>
		</Fragment>
	);
}
