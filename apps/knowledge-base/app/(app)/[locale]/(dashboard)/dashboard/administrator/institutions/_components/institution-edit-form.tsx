"use client";

import type * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { InstitutionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_components/institution-form";
import { discardInstitutionDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/discard-institution-draft.action";
import { publishInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/publish-institution.action";
import { updateInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/update-institution.action";
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
		relations,
		unitRelationStatusOptions,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<EntityFormHeader
				title={t("Edit institution")}
				lifecycle={{
					documentId,
					hasDraft: hasDraftChanges,
					isPublished,
					publishAction: publishInstitutionAction,
					discardDraftAction: discardInstitutionDraftAction,
				}}
			/>

			<InstitutionForm
				formAction={updateInstitutionAction}
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

			<UnitRelationsSection
				relations={relations}
				statusOptions={unitRelationStatusOptions}
				unitId={documentId}
			/>
		</Fragment>
	);
}
