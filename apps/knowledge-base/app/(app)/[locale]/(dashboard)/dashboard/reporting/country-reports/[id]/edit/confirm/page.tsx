import { Button, buttonStyles } from "@dariah-eric/ui/button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { CountryReportSummary } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-summary";
import { confirmCountryReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/confirm-country-report.action";
import { getCountryReportData } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
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

	const [report, { user }] = await Promise.all([getCountryReportData(id), assertAuthenticated()]);

	if (report == null) {
		notFound();
	}

	const t = await getExtracted();
	const canConfirm = await can(user, "confirm", { type: "country_report", id });

	return (
		<div className="flex flex-col gap-y-10">
			<CountryReportSummary data={report.summary} />

			<div className="border-t pt-6 flex flex-col gap-y-4">
				<div className="space-y-1">
					<p className="text-sm font-medium text-fg">{t("Status")}</p>
					<p className="text-sm text-muted-fg">{formatStatus(report.status)}</p>
				</div>

				<div className="flex flex-wrap gap-3">
					{report.status === "draft" && report.campaign.status === "open" && (
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

					<a
						className={buttonStyles({ intent: "plain", size: "sm" })}
						download={`country-report-${id}.json`}
						href={`/api/reporting/country-reports/${id}/download`}
					>
						<ArrowDownTrayIcon className="mr-2 size-4" />
						{t("Download JSON")}
					</a>
				</div>
			</div>
		</div>
	);
}
