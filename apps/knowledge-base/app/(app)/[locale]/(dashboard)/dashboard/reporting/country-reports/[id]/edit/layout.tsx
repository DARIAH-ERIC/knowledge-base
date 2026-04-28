import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { CountryReportStepNav } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/[id]/edit/_components/country-report-step-nav";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";

interface CountryReportEditLayoutProps {
	children: ReactNode;
	params: Promise<{ locale: string; id: string }>;
}

export default async function CountryReportEditLayout(
	props: Readonly<CountryReportEditLayoutProps>,
): Promise<ReactNode> {
	const { children, params } = props;

	const { id } = await params;

	const [report] = await Promise.all([
		db.query.countryReports.findFirst({
			where: { id },
			columns: { id: true },
			with: {
				campaign: { columns: { year: true } },
				country: { columns: { name: true } },
			},
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
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

			<div className="flex flex-col gap-y-6 px-(--layout-padding) pt-6">
				<CountryReportStepNav reportId={id} />
				{children}
			</div>
		</div>
	);
}
