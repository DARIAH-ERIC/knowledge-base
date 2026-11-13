import { buttonStyles } from "@dariah-eric/ui/button-styles";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getWorkingGroupReportHeaderForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/get-working-group-report-summary-data";
import { assertAuthenticated } from "@/lib/auth/session";
import { getUserOrganisationalUnitScopes } from "@/lib/data/user-organisational-units";
import { LocaleLink } from "@/lib/navigation/navigation";

interface WorkingGroupReportWelcomeScreenProps {
	reportId: string;
	/** Slug of the working group the report belongs to (the report route's `slug` segment). */
	workingGroupSlug: string;
}

export async function WorkingGroupReportWelcomeScreen(
	props: Readonly<WorkingGroupReportWelcomeScreenProps>,
): Promise<ReactNode> {
	const { reportId, workingGroupSlug } = props;

	const { user } = await assertAuthenticated();
	const [result, scopes] = await Promise.all([
		getWorkingGroupReportHeaderForUser(user, reportId, "update"),
		getUserOrganisationalUnitScopes(user),
	]);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;

	const t = await getExtracted();

	/**
	 * Admins have no delegated scopes; they maintain working group details from the administrator
	 * dashboard.
	 */
	const workingGroup = scopes.workingGroups.find((item) => item.slug === workingGroupSlug);
	const workingGroupHref = `/dashboard/working-groups/${workingGroupSlug}`;

	return (
		<div className="flex flex-col gap-y-10">
			<section className="flex flex-col gap-y-3">
				<h2 className="text-lg font-semibold text-fg">
					{t("Welcome to the {year} working group report", {
						year: String(report.campaign.year),
					})}
				</h2>
				<div className="flex flex-col gap-y-3 text-sm text-muted-fg max-inline-2xl">
					<p>
						{t(
							"This report collects the activities of the {workingGroup} working group for the reporting campaign. Each tab covers one section of the report, and several sections are prefilled with data from the knowledge base.",
							{ workingGroup: report.workingGroup.name },
						)}
					</p>
					<p>
						{t(
							"Work through the tabs one by one. When everything is complete, review the report on the Summary tab and submit it from there.",
						)}
					</p>
				</div>
			</section>

			<section className="flex flex-col gap-y-3 border-bs pbs-6">
				<h2 className="text-sm font-semibold text-fg">{t("Before you start")}</h2>
				<p className="text-sm text-muted-fg max-inline-2xl">
					{t(
						"Parts of this report are based on the details of your working group in the knowledge base, such as its chairs and members. Please make sure this information is up to date before you fill in the report.",
					)}
				</p>
				{workingGroup?.canEdit === true ? (
					<LocaleLink
						className={buttonStyles({ intent: "secondary", size: "sm", className: "self-start" })}
						href={`${workingGroupHref}/edit`}
					>
						{t("Edit working group details")}
					</LocaleLink>
				) : workingGroup != null ? (
					<div className="flex flex-col gap-y-3">
						<p className="text-sm text-muted-fg max-inline-2xl">
							{t(
								"You cannot edit these details yourself. If something is out of date, please contact your working group chairs.",
							)}
						</p>
						<LocaleLink
							className="self-start text-sm text-fg underline underline-offset-4"
							href={workingGroupHref}
						>
							{t("View working group details")}
						</LocaleLink>
					</div>
				) : null}
			</section>
		</div>
	);
}
