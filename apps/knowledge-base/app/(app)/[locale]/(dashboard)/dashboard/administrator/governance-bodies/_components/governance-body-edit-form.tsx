"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { GovernanceBodyForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_components/governance-body-form";
import { updateGovernanceBodyAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/governance-bodies/_lib/update-governance-body.action";
import type { UnitRelation, UnitRelationOption } from "@/lib/data/unit-relations";

interface GovernanceBodyEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	governanceBody: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
		description?: JSONContent;
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } | null };
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
	initialRelatedEntityIds: Array<string>;
	initialRelatedResourceIds: Array<string>;
	relations: Array<UnitRelation>;
	allowedRelationOptions: Array<UnitRelationOption>;
}

export function GovernanceBodyEditForm(props: Readonly<GovernanceBodyEditFormProps>): ReactNode {
	const {
		initialAssets,
		governanceBody,
		relatedEntities,
		relatedResources,
		initialRelatedEntityIds,
		initialRelatedResourceIds,
		relations,
		allowedRelationOptions,
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
				initialRelatedResourceIds={initialRelatedResourceIds}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
			/>

			<UnitRelationsSection
				allowedOptions={allowedRelationOptions}
				relations={relations}
				unitId={governanceBody.id}
			/>
		</Fragment>
	);
}
