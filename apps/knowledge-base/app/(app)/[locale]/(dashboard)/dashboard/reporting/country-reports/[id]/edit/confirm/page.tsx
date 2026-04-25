import { db } from "@dariah-eric/database/client";
import { Button } from "@dariah-eric/ui/button";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { confirmCountryReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/confirm-country-report.action";
import { submitCountryReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/submit-country-report.action";
import { can } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportConfirmPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportConfirmPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Confirm country report"),
	});
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function DashboardReportingCountryReportConfirmPage(
	props: Readonly<DashboardReportingCountryReportConfirmPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report, { user }] = await Promise.all([
		db.query.countryReports.findFirst({
			where: { id },
			columns: { id: true, status: true },
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	const t = await getExtracted();
	const canConfirm = await can(user, "confirm", { type: "country_report", id });

	return (
		<div className="flex flex-col gap-y-6">
			<div className="space-y-1">
				<p className="text-sm font-medium text-fg">{t("Status")}</p>
				<p className="text-sm text-muted-fg">{formatStatus(report.status)}</p>
			</div>

			<div className="flex gap-x-3">
				{report.status === "draft" && (
					<form action={submitCountryReportAction}>
						<input name="id" type="hidden" value={report.id} />
						<Button type="submit">{t("Submit report")}</Button>
					</form>
				)}

				{canConfirm && report.status === "submitted" && (
					<form action={confirmCountryReportAction}>
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
