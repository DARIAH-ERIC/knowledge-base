"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Tab, TabList, TabPanel } from "@dariah-eric/ui/tabs";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityEditTabs } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-edit-tabs";
import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { EntityRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-relations-fields";
import { PageItemForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_components/page-item-form";
import { discardPageItemDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_lib/discard-page-item-draft.action";
import { publishPageItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_lib/publish-page-item.action";
import { updatePageItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_lib/update-page-item.action";

interface PageItemEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	pageItem: Pick<schema.Page, "id" | "title" | "summary"> & {
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
}

export function PageItemEditForm(props: Readonly<PageItemEditFormProps>): ReactNode {
	const {
		initialAssets,
		contentBlocks,
		documentId,
		hasDraftChanges,
		isPublished,
		pageItem,
		initialRelatedEntityIds,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceIds,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		selectedRelatedEntities,
		selectedRelatedResources,
	} = props;

	const t = useExtracted();
	const formId = "page-item-edit-form";

	return (
		<Fragment>
			<EntityFormHeader
				title={t("Edit page")}
				lifecycle={{
					documentId,
					hasDraft: hasDraftChanges,
					isPublished,
					publishAction: publishPageItemAction,
					discardDraftAction: discardPageItemDraftAction,
				}}
			/>

			<EntityEditTabs defaultTab="details">
				<TabList aria-label={t("Edit page")}>
					<Tab id="details">{t("Details")}</Tab>
					<Tab id="relations">{t("Relations")}</Tab>
				</TabList>

				<TabPanel id="details" shouldForceMount={true}>
					<PageItemForm
						contentBlocks={contentBlocks}
						formAction={updatePageItemAction}
						formId={formId}
						initialAssets={initialAssets}
						initialRelatedEntityItems={initialRelatedEntityItems}
						initialRelatedEntityTotal={initialRelatedEntityTotal}
						initialRelatedResourceItems={initialRelatedResourceItems}
						initialRelatedResourceTotal={initialRelatedResourceTotal}
						pageItem={pageItem}
						showRelationFields={false}
					/>
				</TabPanel>

				<TabPanel id="relations" shouldForceMount={true}>
					<EntityRelationsFields
						formId={formId}
						initialRelatedEntityIds={initialRelatedEntityIds}
						initialRelatedEntityItems={initialRelatedEntityItems}
						initialRelatedEntityTotal={initialRelatedEntityTotal}
						initialRelatedResourceIds={initialRelatedResourceIds}
						initialRelatedResourceItems={initialRelatedResourceItems}
						initialRelatedResourceTotal={initialRelatedResourceTotal}
						selectedRelatedEntities={selectedRelatedEntities}
						selectedRelatedResources={selectedRelatedResources}
					/>
				</TabPanel>
			</EntityEditTabs>
		</Fragment>
	);
}
