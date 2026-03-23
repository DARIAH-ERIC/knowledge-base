import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { EventsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/events-page";
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

export default function DashboardWebsiteEventsPage(
	_props: Readonly<DashboardWebsiteEventsPageProps>,
): ReactNode {
	const events = getEvents({ limit: 500 });

	return (
		<Suspense fallback={<LoadingScreen />}>
			<EventsPage events={events} />
		</Suspense>
	);
}
