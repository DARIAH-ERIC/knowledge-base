"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { GovernanceBodyForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_components/governance-body-form";
import { updateGovernanceBodyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_lib/update-governance-body.action";
import type { UnitRelation, UnitRelationStatusOption } from "@/lib/data/unit-relations";

interface GovernanceBodyEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	governanceBody: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
		description?: JSONContent;
		entity: { documentId: string; slug: string };
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

export function GovernanceBodyEditForm(props: Readonly<GovernanceBodyEditFormProps>): ReactNode {
	const {
		initialAssets,
		governanceBody,
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
			<Heading>{t("Edit governance body")}</Heading>

			<GovernanceBodyForm
				formAction={updateGovernanceBodyAction}
				governanceBody={governanceBody}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedEntityItems={initialRelatedEntityItems}
				initialRelatedEntityTotal={initialRelatedEntityTotal}
				initialRelatedResourceIds={initialRelatedResourceIds}
				initialRelatedResourceItems={initialRelatedResourceItems}
				initialRelatedResourceTotal={initialRelatedResourceTotal}
				selectedRelatedEntities={selectedRelatedEntities}
				selectedRelatedResources={selectedRelatedResources}
			/>

			<UnitRelationsSection
				relations={relations}
				statusOptions={unitRelationStatusOptions}
				unitId={governanceBody.id}
			/>
		</Fragment>
	);
}
