"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { ContentBlocksView } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks-view";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { RelationStatement } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/relation-statement";
import { VersionSelector } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/version-selector";
import type { PersonArticle } from "@/lib/data/article-contributors";
import type { PersonContribution } from "@/lib/data/contributions";
import { getEntityDetailHref, getOrganisationalUnitDetailHref } from "@/lib/entity-detail-href";
import { getEntityTypeLabel } from "@/lib/entity-type-label";
import { getOrcidUrl } from "@/lib/external-identifier-url";
import { formatRoleType } from "@/lib/format-role-type";

interface PersonDetailsProps {
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	person: Pick<schema.Person, "email" | "id" | "name" | "orcid" | "sortName"> & {
		biographyContentBlocks: Array<ContentBlock>;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } | null };
	contributions: Array<PersonContribution>;
	/** Read-only lens: the edge is owned by the article, so it is not editable from here. */
	articles: Array<PersonArticle>;
	publishAction: (documentId: string) => Promise<unknown>;
	discardDraftAction?: (documentId: string) => Promise<unknown>;
}

export function PersonDetails(props: Readonly<PersonDetailsProps>): ReactNode {
	const {
		articles,
		contributions,
		documentId,
		hasDraft,
		isPublished,
		person,
		publishAction,
		discardDraftAction,
		selectedVersion,
	} = props;

	const t = useExtracted();

	const orcidUrl = getOrcidUrl(person.orcid);

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<VersionSelector
					draftHref={`/dashboard/administrator/persons/${person.entityVersion.entity.slug}/details`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishedHref={`/dashboard/administrator/persons/${person.entityVersion.entity.slug}/details?version=published`}
					selectedVersion={selectedVersion}
				/>
				<EntityLifecycleBar
					discardDraftAction={discardDraftAction}
					documentId={documentId}
					editHref={`/dashboard/administrator/persons/${person.entityVersion.entity.slug}/edit`}
					hasDraft={hasDraft}
					isPublished={isPublished}
					publishAction={publishAction}
				/>
			</div>
			<DescriptionList>
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{person.name}</DescriptionDetails>

				<DescriptionTerm>{t("Slug")}</DescriptionTerm>
				<DescriptionDetails>{person.entityVersion.entity.slug}</DescriptionDetails>

				<DescriptionTerm>{t("Sort name")}</DescriptionTerm>
				<DescriptionDetails>{person.sortName}</DescriptionDetails>

				<DescriptionTerm>{t("Email")}</DescriptionTerm>
				<DescriptionDetails>{person.email}</DescriptionDetails>

				<DescriptionTerm>{t("ORCID")}</DescriptionTerm>
				<DescriptionDetails>
					{orcidUrl != null ? (
						<a className="underline" href={orcidUrl} rel="noreferrer" target="_blank">
							{person.orcid}
						</a>
					) : (
						person.orcid
					)}
				</DescriptionDetails>

				<DescriptionTerm>{t("Image")}</DescriptionTerm>
				<DescriptionDetails>
					{person.image != null ? (
						<img
							alt=""
							className="block-24 inline-auto max-inline-full rounded-lg object-contain"
							src={person.image.url}
						/>
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Relations")}</DescriptionTerm>
				<DescriptionDetails>
					{contributions.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{contributions.map((contribution) => (
								<RelationStatement
									key={contribution.id}
									duration={contribution.duration}
									relation={formatRoleType(contribution.roleType)}
									source={person.name}
									target={contribution.organisationalUnitName}
									targetHref={getOrganisationalUnitDetailHref(
										contribution.organisationalUnitType,
										contribution.organisationalUnitSlug,
									)}
									targetType={formatRoleType(contribution.organisationalUnitType)}
								/>
							))}
						</ul>
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Articles")}</DescriptionTerm>
				<DescriptionDetails>
					{articles.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{articles.map((article) => (
								<RelationStatement
									key={`${article.entityType}-${article.documentId}`}
									relation={formatRoleType(article.role)}
									source={person.name}
									target={article.title}
									targetHref={getEntityDetailHref({
										entityType: article.entityType,
										slug: article.slug,
									})}
									targetType={getEntityTypeLabel({ entityType: article.entityType })}
								/>
							))}
						</ul>
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Biography")}</DescriptionTerm>
				<DescriptionDetails>
					{person.biographyContentBlocks.length > 0 ? (
						<ContentBlocksView
							key={selectedVersion}
							contentBlocks={person.biographyContentBlocks}
						/>
					) : null}
				</DescriptionDetails>
			</DescriptionList>
		</Fragment>
	);
}
