"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { CountryForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_components/country-form";
import { updateCountryAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_lib/update-country.action";
import type { UnitRelation, UnitRelationOption } from "@/lib/data/unit-relations";

interface CountryEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	country: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
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

export function CountryEditForm(props: Readonly<CountryEditFormProps>): ReactNode {
	const {
		initialAssets,
		country,
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
			<Heading>{t("Edit country")}</Heading>

			<CountryForm
				country={country}
				formAction={updateCountryAction}
				initialAssets={initialAssets}
				initialRelatedEntityIds={initialRelatedEntityIds}
				initialRelatedResourceIds={initialRelatedResourceIds}
				relatedEntities={relatedEntities}
				relatedResources={relatedResources}
			/>

			<UnitRelationsSection
				allowedOptions={allowedRelationOptions}
				relations={relations}
				unitId={country.id}
			/>
		</Fragment>
	);
}
