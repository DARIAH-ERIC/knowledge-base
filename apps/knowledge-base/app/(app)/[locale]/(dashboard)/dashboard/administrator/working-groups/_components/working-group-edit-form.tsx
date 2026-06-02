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
import { WorkingGroupChairsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-chairs-section";
import { WorkingGroupForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-form";
import { discardWorkingGroupDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/discard-working-group-draft.action";
import { publishWorkingGroupAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/publish-working-group.action";
import { updateWorkingGroupAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/update-working-group.action";
import type { AvailablePerson } from "@/lib/data/article-contributors";
import type { UnitRelation, UnitRelationStatusOption } from "@/lib/data/unit-relations";
import type { WorkingGroupChair } from "@/lib/data/working-group-chairs";

interface WorkingGroupEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	workingGroup: Pick<
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
	chairs: Array<WorkingGroupChair>;
	initialPersonItems: Array<AvailablePerson>;
	initialPersonTotal: number;
}

export function WorkingGroupEditForm(props: Readonly<WorkingGroupEditFormProps>): ReactNode {
	const {
		initialAssets,
		documentId,
		hasDraftChanges,
		isPublished,
		workingGroup,
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
		chairs,
		initialPersonItems,
		initialPersonTotal,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<EntityFormHeader title={t("Edit working group")} />

			<EntityEditTabs defaultTab="details">
				<TabList aria-label={t("Edit working group")}>
					<Tab id="details">{t("Details")}</Tab>
					<Tab id="chairs">{t("Chairs")}</Tab>
					<Tab id="relations">{t("Relations")}</Tab>
				</TabList>

				<TabPanel
					className="flex flex-col gap-y-(--layout-padding)"
					id="details"
					shouldForceMount={true}
				>
					<div className="flex justify-end">
						<EntityLifecycleBar
							discardDraftAction={discardWorkingGroupDraftAction}
							documentId={documentId}
							hasDraft={hasDraftChanges}
							isPublished={isPublished}
							publishAction={publishWorkingGroupAction}
						/>
					</div>

					<WorkingGroupForm
						formAction={updateWorkingGroupAction}
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
						workingGroup={workingGroup}
					/>
				</TabPanel>

				<TabPanel id="chairs" shouldForceMount={true}>
					<WorkingGroupChairsSection
						chairs={chairs}
						initialPersonItems={initialPersonItems}
						initialPersonTotal={initialPersonTotal}
						unitId={documentId}
					/>
				</TabPanel>

				<TabPanel id="relations" shouldForceMount={true}>
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
