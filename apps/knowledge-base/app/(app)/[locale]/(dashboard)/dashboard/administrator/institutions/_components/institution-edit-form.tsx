"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { InstitutionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_components/institution-form";
import { updateInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/update-institution.action";
import type { UnitRelation, UnitRelationOption } from "@/lib/data/unit-relations";

interface InstitutionEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	institution: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
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

export function InstitutionEditForm(props: Readonly<InstitutionEditFormProps>): ReactNode {
	const {
		initialAssets,
		institution,
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
			<Heading>{t("Edit institution")}</Heading>

			<InstitutionForm
				formAction={updateInstitutionAction}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedResourceIds={initialRelatedResourceIds}
				institution={institution}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
			/>

			<UnitRelationsSection
				allowedOptions={allowedRelationOptions}
				relations={relations}
				unitId={institution.id}
			/>
		</Fragment>
	);
}
