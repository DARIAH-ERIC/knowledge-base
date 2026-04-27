import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportSoftwarePageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportSoftwarePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report software"),
	});
}

export default async function DashboardReportingCountryReportSoftwarePage(
	_props: Readonly<DashboardReportingCountryReportSoftwarePageProps>,
): Promise<ReactNode> {
	const t = await getExtracted();

	return (
		<div className="flex flex-col gap-y-4">
			<p className="text-sm text-muted-fg">
				{t("Software contributions from the SSH Open Marketplace.")}
			</p>
			<p className="text-sm text-muted-fg italic">{t("Coming soon.")}</p>
		</div>
	);
}
