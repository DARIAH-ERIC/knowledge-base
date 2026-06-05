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
import { formatRoleType } from "@/lib/format-role-type";

interface NationalConsortiumDetailsProps {
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	nationalConsortium: Pick<
		schema.OrganisationalUnit,
		"acronym" | "id" | "name" | "sshocMarketplaceActorId" | "summary"
	> & {
		description: JSONContent | null;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } | null };
	selectedRelatedEntities: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources: Array<{ id: string; name: string; description?: string }>;
	selectedSocialMediaItems: Array<{
		id: string;
		name: string;
		type?: string;
		url?: string;
		description?: string;
	}>;
	relations: Array<UnitRelation>;
	publishAction: (documentId: string) => Promise<unknown>;
	discardDraftAction?: (documentId: string) => Promise<unknown>;
}

export function NationalConsortiumDetails(
	props: Readonly<NationalConsortiumDetailsProps>,
): ReactNode {
	const {
		documentId,
		hasDraft,
		isPublished,
		nationalConsortium,
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

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<VersionSelector
					draftHref={`/dashboard/administrator/national-consortia/${nationalConsortium.entityVersion.entity.slug}/details`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishedHref={`/dashboard/administrator/national-consortia/${nationalConsortium.entityVersion.entity.slug}/details?version=published`}
					selectedVersion={selectedVersion}
				/>
				<EntityLifecycleBar
					discardDraftAction={discardDraftAction}
					documentId={documentId}
					editHref={`/dashboard/administrator/national-consortia/${nationalConsortium.entityVersion.entity.slug}/edit`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishAction={publishAction}
				/>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{nationalConsortium.name}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{nationalConsortium.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Acronym")}</DescriptionTerm>
				<DescriptionDetails>{nationalConsortium.acronym}</DescriptionDetails>

				<DescriptionTerm>{t("SSHOC actor ID")}</DescriptionTerm>
				<DescriptionDetails>{nationalConsortium.sshocMarketplaceActorId}</DescriptionDetails>

				<DescriptionTerm>{t("Summary")}</DescriptionTerm>
				<DescriptionDetails>{nationalConsortium.summary}</DescriptionDetails>

				<DescriptionTerm>{t("Image")}</DescriptionTerm>
				<DescriptionDetails>
					{nationalConsortium.image != null ? (
						<img
							alt=""
							className="block-24 inline-auto max-inline-full rounded-lg object-cover"
							src={nationalConsortium.image.url}
						/>
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Description")}</DescriptionTerm>
				<DescriptionDetails>
					{nationalConsortium.description != null ? (
						<RichTextRenderer key={selectedVersion} content={nationalConsortium.description} />
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
									<span className="font-medium">{formatRoleType(relation.statusType)}</span>
									{" · "}
									<span className="text-muted-fg">{relation.relatedUnitName}</span>
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
