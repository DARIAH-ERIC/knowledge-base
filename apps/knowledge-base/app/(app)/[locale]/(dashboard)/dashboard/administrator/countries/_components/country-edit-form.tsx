"use client";

import type * as schema from "@dariah-eric/database/schema";
import { TabList, TabPanel } from "@dariah-eric/ui/tabs";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import {
	EntityEditTab,
	EntityEditTabs,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-edit-tabs";
import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { PersonRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/person-relations-section";
import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { CountryForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_components/country-form";
import { discardCountryDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_lib/discard-country-draft.action";
import { publishCountryAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_lib/publish-country.action";
import { updateCountryAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_lib/update-country.action";
import type { ContributionPersonOption } from "@/lib/data/contributions";
import type { PersonRelation, PersonRelationRoleOption } from "@/lib/data/person-relations";
import type { UnitRelation, UnitRelationStatusOption } from "@/lib/data/unit-relations";

interface CountryEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	country: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
		descriptionContentBlocks?: Array<ContentBlock>;
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

export function CountryEditForm(props: Readonly<CountryEditFormProps>): ReactNode {
	const {
		initialAssets,
		documentId,
		hasDraftChanges,
		isPublished,
		country,
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
	const formId = "country-edit-form";

	return (
		<Fragment>
			<EntityFormHeader title={t("Edit country")} />

			<EntityEditTabs defaultTab="details">
				<TabList aria-label={t("Edit country")}>
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
							discardDraftAction={discardCountryDraftAction}
							documentId={documentId}
							hasDraft={hasDraftChanges}
							isPublished={isPublished}
							publishAction={publishCountryAction}
						/>
					</div>

					<CountryForm
						country={country}
						formAction={updateCountryAction}
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
						selectedRelatedEntities={selectedRelatedEntities}
						selectedRelatedResources={selectedRelatedResources}
						selectedSocialMediaItems={selectedSocialMediaItems}
						showSaveAndPublish={true}
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
