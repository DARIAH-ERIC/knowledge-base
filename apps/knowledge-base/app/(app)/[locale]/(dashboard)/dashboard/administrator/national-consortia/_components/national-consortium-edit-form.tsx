"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Link } from "@dariah-eric/ui/link";
import { TabList, TabPanel } from "@dariah-eric/ui/tabs";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import {
	EntityEditTab,
	EntityEditTabs,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-edit-tabs";
import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { ReverseUnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/reverse-unit-relations-section";
import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { NationalConsortiumForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortium-form";
import { discardNationalConsortiumDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/discard-national-consortium-draft.action";
import { publishNationalConsortiumAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/publish-national-consortium.action";
import { updateNationalConsortiumAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/update-national-consortium.action";
import type {
	ReverseUnitRelation,
	UnitRelation,
	UnitRelationStatusOption,
} from "@/lib/data/unit-relations";

interface NationalConsortiumEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	nationalConsortium: Pick<
		schema.OrganisationalUnit,
		"acronym" | "id" | "name" | "ror" | "sshocMarketplaceActorId" | "summary"
	> & {
		descriptionContentBlocks?: Array<ContentBlock>;
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
	unitRelationStatusOptions: Array<UnitRelationStatusOption>;
	memberInstitutions: Array<ReverseUnitRelation>;
	memberInstitutionStatusOptions: Array<UnitRelationStatusOption>;
}

export function NationalConsortiumEditForm(
	props: Readonly<NationalConsortiumEditFormProps>,
): ReactNode {
	const {
		initialAssets,
		documentId,
		hasDraftChanges,
		isPublished,
		nationalConsortium,
		initialRelatedEntityIds,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceIds,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		initialSocialMediaIds,
		initialSocialMediaItems,
		initialSocialMediaTotal,
		selectedRelatedEntities,
		selectedRelatedResources,
		selectedSocialMediaItems,
		relations,
		unitRelationStatusOptions,
		memberInstitutions,
		memberInstitutionStatusOptions,
	} = props;

	const t = useExtracted();
	const formId = "national-consortium-edit-form";

	// Membership in this national consortium is edited here; partner institutions (members and
	// cooperating partners of the country) are edited on the country instead. Link there when we can
	// resolve the consortium's country via its `is_national_consortium_of` relation.
	const countrySlug =
		relations.find((relation) => relation.statusType === "is_national_consortium_of")
			?.relatedUnitSlug ?? null;

	return (
		<Fragment>
			<EntityFormHeader title={t("Edit national consortium")} />

			<EntityEditTabs defaultTab="details">
				<TabList aria-label={t("Edit national consortium")}>
					<EntityEditTab id="details">{t("Details")}</EntityEditTab>
					<EntityEditTab id="relations">{t("Relations")}</EntityEditTab>
					<EntityEditTab id="institutions">{t("Institutions")}</EntityEditTab>
				</TabList>

				<TabPanel
					className="flex flex-col gap-y-(--layout-padding)"
					id="details"
					shouldPreserveState={true}
				>
					<div className="flex justify-end">
						<EntityLifecycleBar
							discardDraftAction={discardNationalConsortiumDraftAction}
							documentId={documentId}
							hasDraft={hasDraftChanges}
							isPublished={isPublished}
							publishAction={publishNationalConsortiumAction}
						/>
					</div>

					<NationalConsortiumForm
						formAction={updateNationalConsortiumAction}
						formId={formId}
						initialAssets={initialAssets}
						initialRelatedEntityIds={initialRelatedEntityIds}
						initialRelatedEntityItems={initialRelatedEntityItems}
						initialRelatedEntityTotal={initialRelatedEntityTotal}
						initialRelatedResourceIds={initialRelatedResourceIds}
						initialRelatedResourceItems={initialRelatedResourceItems}
						initialRelatedResourceTotal={initialRelatedResourceTotal}
						initialSocialMediaIds={initialSocialMediaIds}
						initialSocialMediaItems={initialSocialMediaItems}
						initialSocialMediaTotal={initialSocialMediaTotal}
						nationalConsortium={nationalConsortium}
						selectedRelatedEntities={selectedRelatedEntities}
						selectedRelatedResources={selectedRelatedResources}
						selectedSocialMediaItems={selectedSocialMediaItems}
						showSaveAndPublish={true}
					/>
				</TabPanel>

				<TabPanel id="relations" shouldPreserveState={true}>
					<UnitRelationsSection
						relations={relations}
						statusOptions={unitRelationStatusOptions}
						unitDocumentId={documentId}
					/>
				</TabPanel>

				<TabPanel
					className="flex flex-col gap-y-(--layout-padding)"
					id="institutions"
					shouldPreserveState={true}
				>
					<p className="max-inline-3xl text-sm text-neutral-500">
						{countrySlug != null
							? t.rich(
									'Institutions listed here are members of this national consortium. To edit "partner institutions", the "national coordinating institution", or the "national representative institution", go to the country\'s <link>institutions</link>.',
									{
										link(chunks) {
											return (
												<Link
													className="underline"
													href={`/dashboard/administrator/countries/${countrySlug}/edit?tab=institutions`}
												>
													{chunks}
												</Link>
											);
										},
									},
								)
							: t("Institutions listed here are members of this national consortium.")}
					</p>

					<ReverseUnitRelationsSection
						messages={{
							title: t("Institutions"),
							memberLabel: t("Institution"),
							empty: t("No institutions."),
							addButton: t("Add institution"),
						}}
						relatedUnitDocumentId={documentId}
						relations={memberInstitutions}
						sourceUnitType="institution"
						statusOptions={memberInstitutionStatusOptions}
					/>
				</TabPanel>
			</EntityEditTabs>
		</Fragment>
	);
}
