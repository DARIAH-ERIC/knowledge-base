import { db } from "@dariah-eric/database";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { WorkingGroupReportEventsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/working-group-report-events-form";
import { createWorkingGroupReportEventAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/create-working-group-report-event.action";
import { deleteWorkingGroupReportEventAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/delete-working-group-report-event.action";
import { assertAuthenticated } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingWorkingGroupReportEventsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingWorkingGroupReportEventsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Working group report events"),
	});
}

export default async function DashboardReportingWorkingGroupReportEventsPage(
	props: Readonly<DashboardReportingWorkingGroupReportEventsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report] = await Promise.all([
		db.query.workingGroupReports.findFirst({
			where: { id },
			columns: { id: true },
			with: {
				events: {
					columns: { id: true, title: true, date: true, url: true, role: true },
					orderBy: { date: "asc" },
				},
			},
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	return (
		<WorkingGroupReportEventsForm
			addAction={createWorkingGroupReportEventAction}
			deleteAction={deleteWorkingGroupReportEventAction}
			report={report}
		/>
	);
}
