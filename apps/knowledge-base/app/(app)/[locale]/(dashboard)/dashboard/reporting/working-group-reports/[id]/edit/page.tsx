import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { WorkingGroupReportUserEditContent } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/working-group-report-user-edit-content";
import { can } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingEditWorkingGroupReportPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingEditWorkingGroupReportPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Dashboard - Edit working group report"),
	});

	return metadata;
}

export default async function DashboardReportingEditWorkingGroupReportPage(
	props: Readonly<DashboardReportingEditWorkingGroupReportPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report, { user }] = await Promise.all([
		db.query.workingGroupReports.findFirst({
			where: { id },
			columns: { id: true, status: true },
			with: {
				campaign: { columns: { year: true } },
				workingGroup: { columns: { name: true } },
			},
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	const canConfirm = await can(user, "confirm", { type: "working_group_report", id });

	return <WorkingGroupReportUserEditContent canConfirm={canConfirm} report={report} />;
}
