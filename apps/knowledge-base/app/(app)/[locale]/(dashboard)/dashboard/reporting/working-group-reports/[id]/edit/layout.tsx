import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { getWorkingGroupReportHeaderForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/get-working-group-report-summary-data";
import { WorkingGroupReportStepNav } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/[id]/edit/_components/working-group-report-step-nav";
import { assertAuthenticated } from "@/lib/auth/session";

interface WorkingGroupReportEditLayoutProps {
	children: ReactNode;
	params: Promise<{ locale: string; id: string }>;
}

export default async function WorkingGroupReportEditLayout(
	props: Readonly<WorkingGroupReportEditLayoutProps>,
): Promise<ReactNode> {
	const { children, params } = props;

	const { id } = await params;

	const { user } = await assertAuthenticated();
	const result = await getWorkingGroupReportHeaderForUser(user, id, "update");

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;

	return (
		<div>
			<Header>
				<HeaderContent>
					<HeaderTitle>{report.workingGroup.name}</HeaderTitle>
					<HeaderDescription>
						{"Campaign "}
						{report.campaign.year}
					</HeaderDescription>
				</HeaderContent>
			</Header>

			<div className="flex flex-col gap-y-6 px-(--layout-padding) pt-6">
				<WorkingGroupReportStepNav reportId={id} />
				{children}
			</div>
		</div>
	);
}
