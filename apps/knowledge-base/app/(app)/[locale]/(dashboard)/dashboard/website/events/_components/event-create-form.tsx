"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { EventForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/event-form";
import { createEventAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/create-event.action";

interface EventCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
}

export function EventCreateForm(props: Readonly<EventCreateFormProps>): ReactNode {
	const { initialAssets } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New event")}</Heading>

			<EventForm formAction={createEventAction} initialAssets={initialAssets} />
		</Fragment>
	);
}
