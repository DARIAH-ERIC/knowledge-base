import { db } from "@dariah-eric/database/client";
import { Button } from "@dariah-eric/ui/button";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { confirmWorkingGroupReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/confirm-working-group-report.action";
import { submitWorkingGroupReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/submit-working-group-report.action";
import { can } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingWorkingGroupReportConfirmPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingWorkingGroupReportConfirmPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Confirm working group report"),
	});
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function DashboardReportingWorkingGroupReportConfirmPage(
	props: Readonly<DashboardReportingWorkingGroupReportConfirmPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report, { user }] = await Promise.all([
		db.query.workingGroupReports.findFirst({
			where: { id },
			columns: { id: true, status: true },
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	const t = await getExtracted();
	const canConfirm = await can(user, "confirm", { type: "working_group_report", id });

	return (
		<div className="flex flex-col gap-y-6">
			<div className="space-y-1">
				<p className="text-sm font-medium text-fg">{t("Status")}</p>
				<p className="text-sm text-muted-fg">{formatStatus(report.status)}</p>
			</div>

			<div className="flex gap-x-3">
				{report.status === "draft" && (
					<form action={submitWorkingGroupReportAction}>
						<input name="id" type="hidden" value={report.id} />
						<Button type="submit">{t("Submit report")}</Button>
					</form>
				)}

				{canConfirm && report.status === "submitted" && (
					<form action={confirmWorkingGroupReportAction}>
						<input name="id" type="hidden" value={report.id} />
						<Button type="submit">{t("Accept report")}</Button>
					</form>
				)}

				{report.status === "accepted" && (
					<p className="text-sm text-muted-fg">{t("This report has been accepted.")}</p>
				)}
			</div>
		</div>
	);
}
