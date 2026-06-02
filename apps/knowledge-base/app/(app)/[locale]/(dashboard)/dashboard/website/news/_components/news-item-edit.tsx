"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Tab, TabList, TabPanel } from "@dariah-eric/ui/tabs";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityEditTabs } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-edit-tabs";
import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { EntityRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-relations-fields";
import { NewsItemForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-item-form";
import { discardNewsItemDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/discard-news-item-draft.action";
import { publishNewsItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/publish-news-item.action";
import { updateNewsItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/update-news-item.action";

interface NewsItemEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	newsItem: Pick<schema.NewsItem, "id" | "title" | "summary"> & {
		entityVersion: { entity: { id: string; slug: string }; status: { type: string } };
	} & { image: { key: string; label: string; url: string } };
	initialRelatedEntityIds: Array<string>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds: Array<string>;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
	selectedRelatedEntities: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources: Array<{ id: string; name: string; description?: string }>;
}

export function NewsItemEditForm(props: Readonly<NewsItemEditFormProps>): ReactNode {
	const {
		initialAssets,
		contentBlocks,
		documentId,
		hasDraftChanges,
		isPublished,
		newsItem,
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
	const formId = "news-item-edit-form";

	return (
		<Fragment>
			<EntityFormHeader
				title={t("Edit news item")}
				lifecycle={{
					documentId,
					hasDraft: hasDraftChanges,
					isPublished,
					publishAction: publishNewsItemAction,
					discardDraftAction: discardNewsItemDraftAction,
				}}
			/>

			<EntityEditTabs defaultTab="details">
				<TabList aria-label={t("Edit news item")}>
					<Tab id="details">{t("Details")}</Tab>
					<Tab id="relations">{t("Relations")}</Tab>
				</TabList>

				<TabPanel id="details" shouldForceMount={true}>
					<NewsItemForm
						contentBlocks={contentBlocks}
						formAction={updateNewsItemAction}
						formId={formId}
						initialAssets={initialAssets}
						initialRelatedEntityItems={initialRelatedEntityItems}
						initialRelatedEntityTotal={initialRelatedEntityTotal}
						initialRelatedResourceItems={initialRelatedResourceItems}
						initialRelatedResourceTotal={initialRelatedResourceTotal}
						newsItem={newsItem}
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
