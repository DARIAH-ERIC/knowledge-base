import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted, getLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { assertAuthenticated } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingPageProps extends PageProps<"/[locale]/dashboard/reporting"> {}

export async function generateMetadata(
	_props: Readonly<DashboardReportingPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Dashboard - Reporting"),
	});

	return metadata;
}

export default async function DashboardReportingPage(
	_props: Readonly<DashboardReportingPageProps>,
): Promise<ReactNode> {
	const { user } = await assertAuthenticated();

	// Non-admins find the current campaign on the dashboard home, and earlier reports on the Reports
	// tab of their national consortium or working group.
	redirect({
		href: user.role === "admin" ? "/dashboard/reporting/administrator" : "/dashboard",
		locale: await getLocale(),
	});
}
