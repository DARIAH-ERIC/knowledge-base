import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { EventsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/events-page";
import { getEvents } from "@/lib/data/cached/events";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams } from "@/lib/server/list-search-params";

interface DashboardWebsiteEventsPageProps extends PageProps<"/[locale]/dashboard/website/events"> {}

const pageSize = 10;

function createListHref(q: string, page: number): string {
	const searchParams = new URLSearchParams();

	if (q !== "") {
		searchParams.set("q", q);
	}

	if (page > 1) {
		searchParams.set("page", String(page));
	}

	const query = searchParams.toString();

	return `/dashboard/website/events${query !== "" ? `?${query}` : ""}`;
}

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
	props: Readonly<DashboardWebsiteEventsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const events = await getEvents({ limit: pageSize, offset: (page - 1) * pageSize, q });
	const totalPages = Math.max(Math.ceil(events.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages), locale: locale as IntlLocale });
	}

	return <EventsPage key={`${q}:${String(page)}`} events={events} page={page} q={q} />;
}
