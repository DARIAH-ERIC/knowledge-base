import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ProjectsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/projects-page";
import { getProjects } from "@/lib/data/projects";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams } from "@/lib/server/list-search-params";

interface DashboardAdministratorProjectsPageProps extends PageProps<"/[locale]/dashboard/administrator/projects"> {}

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

	return `/dashboard/administrator/projects${query !== "" ? `?${query}` : ""}`;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorProjectsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Projects"),
	});

	return metadata;
}

export default async function DashboardAdministratorProjectsPage(
	props: Readonly<DashboardAdministratorProjectsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const projects = await getProjects({ limit: pageSize, offset: (page - 1) * pageSize, q });
	const totalPages = Math.max(Math.ceil(projects.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages), locale: locale as IntlLocale });
	}

	return <ProjectsPage key={`${q}:${String(page)}`} page={page} projects={projects} q={q} />;
}
