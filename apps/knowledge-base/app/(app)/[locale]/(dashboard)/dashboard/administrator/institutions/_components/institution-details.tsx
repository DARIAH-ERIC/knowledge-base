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
import type { UnitRelation } from "@/lib/data/unit-relations";

interface InstitutionDetailsProps {
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	institution: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
		description?: JSONContent;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } | null };
	initialRelatedEntityIds: Array<string>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds: Array<string>;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
	initialSocialMediaIds: Array<string>;
	initialSocialMediaItems: Array<{ id: string; name: string; description?: string }>;
	initialSocialMediaTotal: number;
	selectedRelatedEntities: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources: Array<{ id: string; name: string; description?: string }>;
	selectedSocialMediaItems: Array<{ id: string; name: string; description?: string }>;
	relations: Array<UnitRelation>;

	publishAction: (documentId: string) => Promise<unknown>;
	discardDraftAction?: (documentId: string) => Promise<unknown>;
}

export function InstitutionDetails(props: Readonly<InstitutionDetailsProps>): ReactNode {
	const {
		documentId,
		hasDraft,
		isPublished,
		institution,
		relations,
		publishAction,
		discardDraftAction,
		selectedRelatedEntities,
		selectedRelatedResources,
		selectedSocialMediaItems,
		selectedVersion,
	} = props;

	const t = useExtracted();
	const format = useFormatter();

	function formatRoleType(type: string): string {
		return type.replaceAll("_", " ");
	}

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<VersionSelector
					draftHref={`/dashboard/administrator/institutions/${institution.entityVersion.entity.slug}/details`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishedHref={`/dashboard/administrator/institutions/${institution.entityVersion.entity.slug}/details?version=published`}
					selectedVersion={selectedVersion}
				/>
				<EntityLifecycleBar
					discardDraftAction={discardDraftAction}
					documentId={documentId}
					editHref={`/dashboard/administrator/institutions/${institution.entityVersion.entity.slug}/edit`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishAction={publishAction}
				/>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{institution.name}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{institution.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Acronym")}</DescriptionTerm>
				<DescriptionDetails>{institution.acronym}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{institution.summary}</DescriptionDetails>

				<DescriptionTerm>{t("Image")}</DescriptionTerm>
				<DescriptionDetails>
					{institution.image != null ? (
						<img
							alt=""
							className="block-24 inline-24 rounded-lg object-cover"
							src={institution.image.url}
						/>
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Description")}</DescriptionTerm>
				<DescriptionDetails>
					{institution.description != null ? (
						<RichTextRenderer key={selectedVersion} content={institution.description} />
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Social Media")}</DescriptionTerm>
				<DescriptionDetails>
					{selectedSocialMediaItems.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{selectedSocialMediaItems.map((socialMediaItem) => (
								<li key={socialMediaItem.id} className="text-sm">
									<span className="font-medium">{socialMediaItem.name}</span>
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
									<span className="font-medium">{relatedEntity.name}</span>
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

				<DescriptionTerm>{t("Relations")}</DescriptionTerm>
				<DescriptionDetails>
					{relations.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{relations.map((relation) => (
								<li key={relation.id} className="text-sm">
									<span className="text-muted-fg">{formatRoleType(relation.statusType)}</span>
									{" · "}
									<span className="font-medium">{relation.relatedUnitName}</span>
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
			</DescriptionList>
		</Fragment>
	);
}
