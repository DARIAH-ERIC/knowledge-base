import type * as schema from "@dariah-eric/database/schema";
import { Button } from "@dariah-eric/ui/button";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { confirmCountryReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/confirm-country-report.action";
import { submitCountryReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/submit-country-report.action";

interface CountryReportUserEditContentProps {
	report: Pick<schema.CountryReport, "id" | "status"> & {
		campaign: Pick<schema.ReportingCampaign, "year">;
		country: Pick<schema.OrganisationalUnit, "name">;
	};
	canConfirm: boolean;
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export async function CountryReportUserEditContent(
	props: Readonly<CountryReportUserEditContentProps>,
): Promise<ReactNode> {
	const { report, canConfirm } = props;

	const t = await getExtracted();

	return (
		<div>
			<Header>
				<HeaderContent>
					<HeaderTitle>{report.country.name}</HeaderTitle>
					<HeaderDescription>
						{t("Campaign")} {report.campaign.year}
					</HeaderDescription>
				</HeaderContent>
			</Header>

			<div className="flex flex-col gap-y-6 px-(--layout-padding)">
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
				</div>
			</div>
		</div>
	);
}
