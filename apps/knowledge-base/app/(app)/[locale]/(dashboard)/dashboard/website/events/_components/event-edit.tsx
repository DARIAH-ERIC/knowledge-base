"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { EventForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/event-form";
import { discardEventDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/discard-event-draft.action";
import { publishEventAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/publish-event.action";
import { updateEventAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/update-event.action";

interface EventEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	event: Pick<
		schema.Event,
		"id" | "duration" | "isFullDay" | "location" | "title" | "summary" | "website"
	> & {
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

export function EventEditForm(props: Readonly<EventEditFormProps>): ReactNode {
	const {
		initialAssets,
		contentBlocks,
		documentId,
		hasDraftChanges,
		isPublished,
		event,
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

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<Heading>{t("Edit event")}</Heading>
				<EntityLifecycleBar
					discardDraftAction={discardEventDraftAction}
					documentId={documentId}
					hasDraft={hasDraftChanges}
					isPublished={isPublished}
					publishAction={publishEventAction}
				/>
			</div>

			<EventForm
				contentBlocks={contentBlocks}
				event={event}
				formAction={updateEventAction}
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
		</Fragment>
	);
}
