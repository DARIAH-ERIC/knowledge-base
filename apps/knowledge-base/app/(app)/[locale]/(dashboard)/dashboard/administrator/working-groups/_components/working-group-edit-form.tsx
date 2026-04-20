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
import type { UnitRelation, UnitRelationOption } from "@/lib/data/unit-relations";
import type { WorkingGroupChair } from "@/lib/data/working-group-chairs";

interface WorkingGroupEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	workingGroup: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
		description?: JSONContent;
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } | null };
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
	initialRelatedEntityIds: Array<string>;
	initialRelatedResourceIds: Array<string>;
	relations: Array<UnitRelation>;
	allowedRelationOptions: Array<UnitRelationOption>;
	chairs: Array<WorkingGroupChair>;
	availablePersons: Array<AvailablePerson>;
}

export function WorkingGroupEditForm(props: Readonly<WorkingGroupEditFormProps>): ReactNode {
	const {
		initialAssets,
		workingGroup,
		relatedEntities,
		relatedResources,
		initialRelatedEntityIds,
		initialRelatedResourceIds,
		relations,
		allowedRelationOptions,
		chairs,
		availablePersons,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit working group")}</Heading>

			<WorkingGroupForm
				formAction={updateWorkingGroupAction}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedResourceIds={initialRelatedResourceIds}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
				workingGroup={workingGroup}
			/>

			<WorkingGroupChairsSection
				availablePersons={availablePersons}
				chairs={chairs}
				unitId={workingGroup.id}
			/>

			<UnitRelationsSection
				allowedOptions={allowedRelationOptions}
				relations={relations}
				unitId={workingGroup.id}
			/>
		</Fragment>
	);
}
