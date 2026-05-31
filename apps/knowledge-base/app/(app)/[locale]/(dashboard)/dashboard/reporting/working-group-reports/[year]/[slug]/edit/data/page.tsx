import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { Button } from "@dariah-eric/ui/button";
import { Label } from "@dariah-eric/ui/field";
import { Input } from "@dariah-eric/ui/input";
import { TextField } from "@dariah-eric/ui/text-field";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ReportScreenCommentSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-screen-comment-section";
import { WorkingGroupReportSocialMediaForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/working-group-report-social-media-form";
import { createWorkingGroupReportSocialMediaAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/create-working-group-report-social-media.action";
import { deleteWorkingGroupReportSocialMediaAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/delete-working-group-report-social-media.action";
import { getAuthorizedWorkingGroupReportForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/get-working-group-report-summary-data";
import { updateWorkingGroupReportDataAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/update-working-group-report-data.action";
import { assertAuthenticated } from "@/lib/auth/session";
import { resolveWorkingGroupReportId } from "@/lib/data/reporting-urls";
import { db } from "@/lib/db";
import { alias, and, eq, inArray, sql } from "@/lib/db/sql";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingWorkingGroupReportDataPageProps extends PageProps<"/[locale]/dashboard/reporting/working-group-reports/[year]/[slug]/edit/data"> {}

export async function generateMetadata(
	_props: Readonly<DashboardReportingWorkingGroupReportDataPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Working group report data"),
	});
}

export default async function DashboardReportingWorkingGroupReportDataPage(
	props: Readonly<DashboardReportingWorkingGroupReportDataPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { year: routeYear, slug } = await params;
	const id = await resolveWorkingGroupReportId({ year: routeYear, slug });

	if (id == null) {
		notFound();
	}

	const { user } = await assertAuthenticated();
	const result = await getAuthorizedWorkingGroupReportForUser(
		user,
		id,
		(id) =>
			db.query.workingGroupReports.findFirst({
				where: { id },
				columns: {
					id: true,
					numberOfMembers: true,
					mailingList: true,
					workingGroupDocumentId: true,
					campaignId: true,
				},
				with: {
					campaign: { columns: { year: true } },
					socialMedia: {
						columns: { id: true, socialMediaId: true },
						with: {
							socialMedia: { columns: { id: true, name: true, url: true } },
						},
					},
					workingGroup: {
						columns: { id: true },
						with: {
							socialMedia: { columns: { id: true, name: true, url: true } },
						},
					},
				},
			}),
		"update",
	);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;
	if (report == null) {
		notFound();
	}

	const { year } = report.campaign;

	const personDocumentLifecycle = alias(schema.documentLifecycle, "person_document_lifecycle");
	const chairs = await db
		.select({
			id: schema.personsToOrganisationalUnits.id,
			personName: schema.persons.name,
			roleType: schema.personRoleTypes.type,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			personDocumentLifecycle,
			eq(personDocumentLifecycle.documentId, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.innerJoin(
			schema.persons,
			sql`${schema.persons.id} = COALESCE(${personDocumentLifecycle.draftId}, ${personDocumentLifecycle.publishedId})`,
		)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.where(
			and(
				// report.workingGroupDocumentId is the org-unit document id directly.
				eq(
					schema.personsToOrganisationalUnits.organisationalUnitDocumentId,
					report.workingGroupDocumentId,
				),
				inArray(schema.personRoleTypes.type, ["is_chair_of", "is_vice_chair_of"]),
				sql`
					${schema.personsToOrganisationalUnits.duration} && tstzrange (
						MAKE_DATE(${year}, 1, 1)::TIMESTAMPTZ,
						MAKE_DATE(${year + 1}, 1, 1)::TIMESTAMPTZ
					)
				`,
			),
		)
		.orderBy(schema.persons.sortName, schema.personRoleTypes.type);

	const t = await getExtracted();

	const claimedSocialMediaIds = new Set(report.socialMedia.map((s) => s.socialMediaId));
	// A working group report always references a published working group.
	assert(report.workingGroup, "Working group report is missing its published working group.");
	const availableSocialMedia = report.workingGroup.socialMedia.filter(
		(s) => !claimedSocialMediaIds.has(s.id),
	);

	function formatRole(role: string): string {
		return role
			.replaceAll("_", " ")
			.replace(/^is /, "")
			.replaceAll(/\b\w/g, (c) => c.toUpperCase());
	}

	return (
		<div className="flex flex-col gap-y-12">
			<section className="flex flex-col gap-y-4">
				<h2 className="text-sm font-semibold text-fg">{t("Working group data")}</h2>
				<form
					action={updateWorkingGroupReportDataAction}
					className="flex flex-col gap-y-4 max-inline-sm"
				>
					<input name="id" type="hidden" value={report.id} />
					<TextField
						defaultValue={
							report.numberOfMembers != null ? String(report.numberOfMembers) : undefined
						}
						name="numberOfMembers"
						type="number"
					>
						<Label>{t("Number of members")}</Label>
						<Input min={0} />
					</TextField>
					<TextField defaultValue={report.mailingList ?? undefined} name="mailingList">
						<Label>{t("Mailing list")}</Label>
						<Input />
					</TextField>
					<Button className="self-start" type="submit">
						{t("Save")}
					</Button>
				</form>
			</section>

			{chairs.length > 0 && (
				<section className="flex flex-col gap-y-3">
					<h2 className="text-sm font-semibold text-fg">{t("Chairs")}</h2>
					<ul className="divide-y divide-border rounded-md border max-inline-sm">
						{chairs.map((chair) => (
							<li key={chair.id} className="px-4 py-3">
								<p className="text-sm font-medium text-fg">{chair.personName}</p>
								<p className="text-xs text-muted-fg">{formatRole(chair.roleType)}</p>
							</li>
						))}
					</ul>
				</section>
			)}

			<WorkingGroupReportSocialMediaForm
				addAction={createWorkingGroupReportSocialMediaAction}
				availableSocialMedia={availableSocialMedia}
				deleteAction={deleteWorkingGroupReportSocialMediaAction}
				report={{
					id: report.id,
					socialMedia: report.socialMedia,
				}}
			/>

			<ReportScreenCommentSection
				reportId={report.id}
				reportType="working_group"
				screenKey="data"
			/>
		</div>
	);
}
