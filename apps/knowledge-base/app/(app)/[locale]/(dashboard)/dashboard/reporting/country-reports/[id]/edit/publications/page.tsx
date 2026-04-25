import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportPublicationsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportPublicationsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report publications"),
	});
}

export default async function DashboardReportingCountryReportPublicationsPage(
	_props: Readonly<DashboardReportingCountryReportPublicationsPageProps>,
): Promise<ReactNode> {
	const t = await getExtracted();

	return (
		<div className="flex flex-col gap-y-4">
			<p className="text-sm text-muted-fg">{t("Publications from the Zotero library.")}</p>
			<p className="text-sm text-muted-fg italic">{t("Coming soon.")}</p>
		</div>
	);
}
