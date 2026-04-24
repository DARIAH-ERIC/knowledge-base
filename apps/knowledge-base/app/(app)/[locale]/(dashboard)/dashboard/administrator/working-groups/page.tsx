import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { WorkingGroupsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-groups-page";
import { getWorkingGroups } from "@/lib/data/working-groups";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams } from "@/lib/server/list-search-params";

interface DashboardAdministratorWorkingGroupsPageProps extends PageProps<"/[locale]/dashboard/administrator/working-groups"> {}

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

	return `/dashboard/administrator/working-groups${query !== "" ? `?${query}` : ""}`;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorWorkingGroupsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Working groups"),
	});

	return metadata;
}

export default async function DashboardAdministratorWorkingGroupsPage(
	props: Readonly<DashboardAdministratorWorkingGroupsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const workingGroups = await getWorkingGroups({
		limit: pageSize,
		offset: (page - 1) * pageSize,
		q,
	});
	const totalPages = Math.max(Math.ceil(workingGroups.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages), locale: locale as IntlLocale });
	}

	return (
		<WorkingGroupsPage
			key={`${q}:${String(page)}`}
			page={page}
			q={q}
			workingGroups={workingGroups}
		/>
	);
}
