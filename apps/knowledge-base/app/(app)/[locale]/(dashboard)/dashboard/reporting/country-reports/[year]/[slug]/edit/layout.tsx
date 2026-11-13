import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { AcceptedReportEditWarning } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/accepted-report-edit-warning";
import { ReportEditGuard } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-edit-guard";
import { CountryReportStepNav } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-step-nav";
import { getCountryReportHeaderForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
import { isReportEditable } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import {
	getCountryReportEditHref,
	getCountryReportHref,
	resolveCountryReportId,
} from "@/lib/data/reporting-urls";
import { redirect } from "@/lib/navigation/navigation";

interface CountryReportEditLayoutProps extends LayoutProps<"/[locale]/dashboard/reporting/country-reports/[year]/[slug]/edit"> {}

export default async function CountryReportEditLayout(
	props: Readonly<CountryReportEditLayoutProps>,
): Promise<ReactNode> {
	const { children, params } = props;

	const { year: routeYear, slug } = await params;
	const id = await resolveCountryReportId({ year: routeYear, slug });

	if (id == null) {
		notFound();
	}

	const { user } = await assertAuthenticated();
	const result = await getCountryReportHeaderForUser(user, id, "update");

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;

	// Submitted or accepted reports (and closed campaigns) are view-only for reporters: send a typed or
	// bookmarked edit URL to the report itself instead of showing forms whose saves are rejected.
	// Comments stay possible there. Admins can always edit, so `isReportEditable` lets them through.
	if (!(await isReportEditable(user, { type: "country_report", id }))) {
		const locale = await getLocale();
		redirect({ href: getCountryReportHref(Number(routeYear), slug), locale });
	}

	return (
		<div>
			<Header>
				<HeaderContent>
					<HeaderTitle>{report.country.name}</HeaderTitle>
					<HeaderDescription>
						{"Campaign "}
						{report.campaign.year}
					</HeaderDescription>
				</HeaderContent>
			</Header>

			<div className="flex flex-col gap-y-6 px-(--layout-padding) pbs-6 max-inline-4xl">
				<ReportEditGuard>
					<AcceptedReportEditWarning status={report.status} variant="reporting" />
					<CountryReportStepNav
						editBasePath={getCountryReportEditHref(Number(routeYear), slug)}
						variant="reporting"
					/>
					<div className="inline-full max-inline-4xl">{children}</div>
				</ReportEditGuard>
			</div>
		</div>
	);
}
