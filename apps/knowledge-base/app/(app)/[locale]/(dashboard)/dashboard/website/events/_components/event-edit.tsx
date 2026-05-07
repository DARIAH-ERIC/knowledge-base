"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EventForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/event-form";
import { updateEventAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/update-event.action";

interface EventEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	event: Pick<schema.Event, "id" | "duration" | "location" | "title" | "summary" | "website"> & {
		entityVersion: { entity: { id: string; slug: string } };
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
			<Heading>{t("Edit event")}</Heading>

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
