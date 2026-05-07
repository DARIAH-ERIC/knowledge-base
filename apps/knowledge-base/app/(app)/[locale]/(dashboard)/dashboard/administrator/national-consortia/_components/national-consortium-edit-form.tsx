"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { NationalConsortiumForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortium-form";
import { updateNationalConsortiumAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/update-national-consortium.action";
import type { UnitRelation, UnitRelationStatusOption } from "@/lib/data/unit-relations";

interface NationalConsortiumEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	nationalConsortium: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
		description?: JSONContent;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } | null };
	initialRelatedEntityIds: Array<string>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds: Array<string>;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
	selectedRelatedEntities: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources: Array<{ id: string; name: string; description?: string }>;
	relations: Array<UnitRelation>;
	unitRelationStatusOptions: Array<UnitRelationStatusOption>;
}

export function NationalConsortiumEditForm(
	props: Readonly<NationalConsortiumEditFormProps>,
): ReactNode {
	const {
		initialAssets,
		nationalConsortium,
		initialRelatedEntityIds,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceIds,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		selectedRelatedEntities,
		selectedRelatedResources,
		relations,
		unitRelationStatusOptions,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit national consortium")}</Heading>

			<NationalConsortiumForm
				formAction={updateNationalConsortiumAction}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedEntityItems={initialRelatedEntityItems}
				initialRelatedEntityTotal={initialRelatedEntityTotal}
				initialRelatedResourceIds={initialRelatedResourceIds}
				initialRelatedResourceItems={initialRelatedResourceItems}
				initialRelatedResourceTotal={initialRelatedResourceTotal}
				nationalConsortium={nationalConsortium}
				selectedRelatedEntities={selectedRelatedEntities}
				selectedRelatedResources={selectedRelatedResources}
			/>

			<UnitRelationsSection
				relations={relations}
				statusOptions={unitRelationStatusOptions}
				unitId={nationalConsortium.id}
			/>
		</Fragment>
	);
}
