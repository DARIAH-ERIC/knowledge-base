"use client";

import type * as schema from "@dariah-eric/database/schema";
import { TabList, TabPanel } from "@dariah-eric/ui/tabs";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import {
	EntityEditTab,
	EntityEditTabs,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-edit-tabs";
import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { PersonRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/person-relations-section";
import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { InstitutionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_components/institution-form";
import { discardInstitutionDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/discard-institution-draft.action";
import { publishInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/publish-institution.action";
import { updateInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/update-institution.action";
import type { ContributionPersonOption } from "@/lib/data/contributions";
import type { PersonRelation, PersonRelationRoleOption } from "@/lib/data/person-relations";
import type { UnitRelation, UnitRelationStatusOption } from "@/lib/data/unit-relations";

interface InstitutionEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	institution: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "ror" | "summary"> & {
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
	personRelations: Array<PersonRelation>;
	personRelationRoleOptions: Array<PersonRelationRoleOption>;
	initialPersonItems: Array<ContributionPersonOption>;
	initialPersonTotal: number;
	relations: Array<UnitRelation>;
	unitRelationStatusOptions: Array<UnitRelationStatusOption>;
}

export function InstitutionEditForm(props: Readonly<InstitutionEditFormProps>): ReactNode {
	const {
		initialAssets,
		documentId,
		hasDraftChanges,
		isPublished,
		institution,
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
		personRelations,
		personRelationRoleOptions,
		initialPersonItems,
		initialPersonTotal,
		relations,
		unitRelationStatusOptions,
	} = props;

	const t = useExtracted();
	const formId = "institution-edit-form";

	return (
		<Fragment>
			<EntityFormHeader title={t("Edit institution")} />

			<EntityEditTabs defaultTab="details">
				<TabList aria-label={t("Edit institution")}>
					<EntityEditTab id="details">{t("Details")}</EntityEditTab>
					<EntityEditTab id="people">{t("People")}</EntityEditTab>
					<EntityEditTab id="relations">{t("Relations")}</EntityEditTab>
				</TabList>

				<TabPanel
					className="flex flex-col gap-y-(--layout-padding)"
					id="details"
					shouldPreserveState={true}
				>
					<div className="flex justify-end">
						<EntityLifecycleBar
							discardDraftAction={discardInstitutionDraftAction}
							documentId={documentId}
							hasDraft={hasDraftChanges}
							isPublished={isPublished}
							publishAction={publishInstitutionAction}
						/>
					</div>

					<InstitutionForm
						formAction={updateInstitutionAction}
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
						institution={institution}
						selectedRelatedEntities={selectedRelatedEntities}
						selectedRelatedResources={selectedRelatedResources}
						selectedSocialMediaItems={selectedSocialMediaItems}
					/>
				</TabPanel>

				<TabPanel id="people" shouldPreserveState={true}>
					<PersonRelationsSection
						initialPersonItems={initialPersonItems}
						initialPersonTotal={initialPersonTotal}
						relations={personRelations}
						roleOptions={personRelationRoleOptions}
						unitId={documentId}
					/>
				</TabPanel>

				<TabPanel id="relations" shouldPreserveState={true}>
					<UnitRelationsSection
						relations={relations}
						statusOptions={unitRelationStatusOptions}
						unitId={documentId}
					/>
				</TabPanel>
			</EntityEditTabs>
		</Fragment>
	);
}
