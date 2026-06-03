"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import type { JSONContent } from "@tiptap/core";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { VersionSelector } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/version-selector";
import type { PersonContribution } from "@/lib/data/contributions";

interface PersonDetailsProps {
	documentId: string;
	hasDraft: boolean;
	isPublished: boolean;
	selectedVersion: "draft" | "published";
	person: Pick<schema.Person, "email" | "id" | "name" | "orcid" | "sortName"> & {
		biography?: JSONContent;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } };
	contributions: Array<PersonContribution>;
	publishAction: (documentId: string) => Promise<unknown>;
	discardDraftAction?: (documentId: string) => Promise<unknown>;
}

export function PersonDetails(props: Readonly<PersonDetailsProps>): ReactNode {
	const {
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
	const format = useFormatter();

	function formatRoleType(type: string): string {
		return type.replaceAll("_", " ");
	}

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
				<DescriptionDetails>{person.orcid}</DescriptionDetails>

				<DescriptionTerm>{t("Image")}</DescriptionTerm>
				<DescriptionDetails>
					<img
						alt=""
						className="block-24 inline-24 rounded-lg object-cover"
						src={person.image.url}
					/>
				</DescriptionDetails>

				<DescriptionTerm>{t("Relations")}</DescriptionTerm>
				<DescriptionDetails>
					{contributions.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{contributions.map((contribution) => (
								<li key={contribution.id} className="text-sm">
									<span className="font-medium">{formatRoleType(contribution.roleType)}</span>
									{" · "}
									<span className="text-muted-fg">{contribution.organisationalUnitName}</span>
									<span className="text-muted-fg">
										{" · "}
										{contribution.duration.end
											? format.dateTimeRange(
													contribution.duration.start,
													contribution.duration.end,
													{
														dateStyle: "short",
													},
												)
											: format.dateTime(contribution.duration.start, { dateStyle: "short" })}
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
