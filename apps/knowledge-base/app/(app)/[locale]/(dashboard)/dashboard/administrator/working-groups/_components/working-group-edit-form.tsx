"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { WorkingGroupChairsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-chairs-section";
import { WorkingGroupForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-form";
import { updateWorkingGroupAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/update-working-group.action";
import type { AvailablePerson } from "@/lib/data/article-contributors";
import type { UnitRelation, UnitRelationStatusOption } from "@/lib/data/unit-relations";
import type { WorkingGroupChair } from "@/lib/data/working-group-chairs";

interface WorkingGroupEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	workingGroup: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
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
	chairs: Array<WorkingGroupChair>;
	initialPersonItems: Array<AvailablePerson>;
	initialPersonTotal: number;
}

export function WorkingGroupEditForm(props: Readonly<WorkingGroupEditFormProps>): ReactNode {
	const {
		initialAssets,
		workingGroup,
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
		chairs,
		initialPersonItems,
		initialPersonTotal,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit working group")}</Heading>

			<WorkingGroupForm
				formAction={updateWorkingGroupAction}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedEntityItems={initialRelatedEntityItems}
				initialRelatedEntityTotal={initialRelatedEntityTotal}
				initialRelatedResourceIds={initialRelatedResourceIds}
				initialRelatedResourceItems={initialRelatedResourceItems}
				initialRelatedResourceTotal={initialRelatedResourceTotal}
				selectedRelatedEntities={selectedRelatedEntities}
				selectedRelatedResources={selectedRelatedResources}
				workingGroup={workingGroup}
			/>

			<WorkingGroupChairsSection
				chairs={chairs}
				initialPersonItems={initialPersonItems}
				initialPersonTotal={initialPersonTotal}
				unitId={workingGroup.id}
			/>

			<UnitRelationsSection
				relations={relations}
				statusOptions={unitRelationStatusOptions}
				unitId={workingGroup.id}
			/>
		</Fragment>
	);
}
