import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { SocialMediaPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/social-media/_components/social-media-page";
import { getSocialMedia } from "@/lib/data/social-media";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";
import { getListSearchParams } from "@/lib/server/list-search-params";

interface DashboardAdministratorSocialMediaPageProps extends PageProps<"/[locale]/dashboard/administrator/social-media"> {}

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

	return `/dashboard/administrator/social-media${query !== "" ? `?${query}` : ""}`;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorSocialMediaPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Social media"),
	});

	return metadata;
}

export default async function DashboardAdministratorSocialMediaPage(
	props: Readonly<DashboardAdministratorSocialMediaPageProps>,
): Promise<ReactNode> {
	const { params, searchParams } = props;
	const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
	const { page, q } = getListSearchParams(rawSearchParams);
	const socialMediaItems = await getSocialMedia({
		limit: pageSize,
		offset: (page - 1) * pageSize,
		q,
	});
	const totalPages = Math.max(Math.ceil(socialMediaItems.total / pageSize), 1);

	if (page > totalPages) {
		redirect({ href: createListHref(q, totalPages), locale: locale as IntlLocale });
	}

	return (
		<SocialMediaPage
			key={`${q}:${String(page)}`}
			page={page}
			q={q}
			socialMediaItems={socialMediaItems}
		/>
	);
}
