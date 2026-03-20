"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EventForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/event-form";
import { updateEventAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/update-event.action";

interface EventEditFormProps {
	assets: Array<{ key: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	event: Pick<schema.Event, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; url: string } };
}

export function EventEditForm(props: Readonly<EventEditFormProps>): ReactNode {
	const { assets, contentBlocks, event } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit event")}</Heading>

			<EventForm
				assets={assets}
				contentBlocks={contentBlocks}
				event={event}
				formAction={updateEventAction}
			/>
		</Fragment>
	);
}
