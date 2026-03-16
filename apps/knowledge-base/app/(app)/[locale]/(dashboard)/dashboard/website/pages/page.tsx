import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { PagesTable } from "@/components/ui/tables/pages-table";
import { getPages } from "@/lib/data/cached/pages";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsitePagesPageProps extends PageProps<"/[locale]/dashboard/website/pages"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsitePagesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Pages"),
	});

	return metadata;
}

export default async function DashboardWebsitePagesPage(
	_props: Readonly<DashboardWebsitePagesPageProps>,
): Promise<ReactNode> {
	const t = await getExtracted();

	const pages = await getPages({});

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("Pages")}</h1>
			<PagesTable data={pages} />
		</Main>
	);
}
