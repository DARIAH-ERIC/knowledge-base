"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { NationalConsortiumForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortium-form";
import { updateNationalConsortiumAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/update-national-consortium.action";
import type { UnitRelation, UnitRelationOption } from "@/lib/data/unit-relations";

interface NationalConsortiumEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	nationalConsortium: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
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

export function NationalConsortiumEditForm(
	props: Readonly<NationalConsortiumEditFormProps>,
): ReactNode {
	const {
		initialAssets,
		nationalConsortium,
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
			<Heading>{t("Edit national consortium")}</Heading>

			<NationalConsortiumForm
				formAction={updateNationalConsortiumAction}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedResourceIds={initialRelatedResourceIds}
				nationalConsortium={nationalConsortium}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
			/>

			<UnitRelationsSection
				allowedOptions={allowedRelationOptions}
				relations={relations}
				unitId={nationalConsortium.id}
			/>
		</Fragment>
	);
}
