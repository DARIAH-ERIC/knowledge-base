import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { EventsTable } from "@/components/ui/tables/events-table";
import { getEvents } from "@/lib/data/cached/events";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEventsPageProps extends PageProps<"/[locale]/dashboard/website/events"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEventsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Events"),
	});

	return metadata;
}

export default async function DashboardWebsiteEventsPage(
	_props: Readonly<DashboardWebsiteEventsPageProps>,
): Promise<ReactNode> {
	const t = await getExtracted();

	const events = await getEvents({});

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("Events")}</h1>
			<EventsTable data={events} />
		</Main>
	);
}
