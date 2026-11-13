import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ReportScreenCommentSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-screen-comment-section";
import { CountryReportProjectsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_components/country-report-projects-form";
import { createCountryReportProjectContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/create-country-report-project-contribution.action";
import { createDelegatedProjectAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/create-delegated-project.action";
import { deleteCountryReportProjectContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/delete-country-report-project-contribution.action";
import { getAuthorizedCountryReportForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import {
	getCountryReportProjectContributionRows,
	getCountryReportProjectOptions,
} from "@/lib/data/country-report-projects";
import { getSocialMediaOptions } from "@/lib/data/social-media";
import { db } from "@/lib/db";

interface CountryReportProjectsScreenProps {
	reportId: string;
}

/** Shared "projects" screen. See {@link getAuthorizedCountryReportForUser} for authorization. */
export async function CountryReportProjectsScreen(
	props: Readonly<CountryReportProjectsScreenProps>,
): Promise<ReactNode> {
	const { reportId } = props;

	const { user } = await assertAuthenticated();
	const result = await getAuthorizedCountryReportForUser(
		user,
		reportId,
		async (id) => {
			const report = await db.query.countryReports.findFirst({
				where: { id },
				columns: { id: true },
			});
			if (report == null) {
				return null;
			}
			// Projects resolve draft-first, so a project created from this screen (still a draft) is named.
			const projectContributions = await getCountryReportProjectContributionRows(report.id);
			return { ...report, projectContributions };
		},
		"update",
	);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;

	const [allProjects, { items: initialAssets }, initialSocialMedia, projectScopes] =
		await Promise.all([
			getCountryReportProjectOptions(),
			getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
			getSocialMediaOptions(),
			db.query.projectScopes.findMany({
				orderBy: { scope: "asc" },
				columns: { id: true, scope: true },
			}),
		]);

	return (
		<div className="flex flex-col gap-y-12">
			<CountryReportProjectsForm
				addAction={createCountryReportProjectContributionAction}
				allProjects={allProjects}
				canManageRelations={user.role === "admin"}
				createProject={{
					action: createDelegatedProjectAction,
					initialAssets,
					initialSocialMediaItems: initialSocialMedia.items,
					initialSocialMediaTotal: initialSocialMedia.total,
					scopes: projectScopes,
				}}
				deleteAction={deleteCountryReportProjectContributionAction}
				report={report}
			/>

			<ReportScreenCommentSection reportId={report.id} reportType="country" screenKey="projects" />
		</div>
	);
}
