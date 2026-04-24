import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { UsersPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_components/users-page";
import { assertAuthenticated } from "@/lib/auth/session";
import { getUsers } from "@/lib/data/users";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams } from "@/lib/server/list-search-params";

interface DashboardAdministratorUsersPageProps extends PageProps<"/[locale]/dashboard/administrator/users"> {}

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

	return `/dashboard/administrator/users${query !== "" ? `?${query}` : ""}`;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorUsersPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Users"),
	});

	return metadata;
}

export default async function DashboardAdministratorUsersPage(
	props: Readonly<DashboardAdministratorUsersPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams, { user: currentUser }] = await Promise.all([
		params,
		searchParams,
		assertAuthenticated(),
	]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const users = await getUsers({ limit: pageSize, offset: (page - 1) * pageSize, q });
	const totalPages = Math.max(Math.ceil(users.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages), locale: locale as IntlLocale });
	}

	return (
		<UsersPage
			key={`${q}:${String(page)}`}
			currentUserId={currentUser.id}
			page={page}
			q={q}
			users={users}
		/>
	);
}
