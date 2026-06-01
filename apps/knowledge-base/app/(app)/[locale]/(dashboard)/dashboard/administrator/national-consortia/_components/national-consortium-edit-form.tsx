"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Tab, TabList, TabPanel } from "@dariah-eric/ui/tabs";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { EntityEditTabs } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-edit-tabs";
import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { UnitRelationsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/unit-relations-section";
import { NationalConsortiumForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortium-form";
import { discardNationalConsortiumDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/discard-national-consortium-draft.action";
import { publishNationalConsortiumAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/publish-national-consortium.action";
import { updateNationalConsortiumAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_lib/update-national-consortium.action";
import type { UnitRelation, UnitRelationStatusOption } from "@/lib/data/unit-relations";

interface NationalConsortiumEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	nationalConsortium: Pick<
		schema.OrganisationalUnit,
		"acronym" | "id" | "name" | "sshocMarketplaceActorId" | "summary"
	> & {
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

export function NationalConsortiumEditForm(
	props: Readonly<NationalConsortiumEditFormProps>,
): ReactNode {
	const {
		initialAssets,
		documentId,
		hasDraftChanges,
		isPublished,
		nationalConsortium,
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
			<EntityFormHeader title={t("Edit national consortium")} />

			<EntityEditTabs defaultTab="details">
				<TabList aria-label={t("Edit national consortium")}>
					<Tab id="details">{t("Details")}</Tab>
					<Tab id="relations">{t("Relations")}</Tab>
				</TabList>

				<TabPanel className="flex flex-col gap-y-(--layout-padding)" id="details">
					<div className="flex justify-end">
						<EntityLifecycleBar
							discardDraftAction={discardNationalConsortiumDraftAction}
							documentId={documentId}
							hasDraft={hasDraftChanges}
							isPublished={isPublished}
							publishAction={publishNationalConsortiumAction}
						/>
					</div>

					<NationalConsortiumForm
						formAction={updateNationalConsortiumAction}
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
						nationalConsortium={nationalConsortium}
						selectedRelatedEntities={selectedRelatedEntities}
						selectedRelatedResources={selectedRelatedResources}
						selectedSocialMediaItems={selectedSocialMediaItems}
						showSaveAndPublish={true}
					/>
				</TabPanel>

				<TabPanel id="relations">
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
