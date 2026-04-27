import { and, eq, inArray, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

import type { WorkingGroupReportSummaryData } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/working-group-report-summary";

export interface WorkingGroupReportData {
	id: string;
	status: string;
	workingGroup: { name: string };
	campaign: { year: number; status: string };
	summary: WorkingGroupReportSummaryData;
}

export async function getWorkingGroupReportData(
	id: string,
): Promise<WorkingGroupReportData | null> {
	const report = await db.query.workingGroupReports.findFirst({
		where: { id },
		columns: {
			id: true,
			status: true,
			numberOfMembers: true,
			mailingList: true,
			campaignId: true,
			workingGroupId: true,
		},
		with: {
			campaign: { columns: { year: true, status: true } },
			workingGroup: { columns: { name: true } },
			socialMedia: {
				columns: { id: true },
				with: { socialMedia: { columns: { name: true, url: true } } },
			},
			events: {
				columns: { id: true, title: true, date: true, url: true, role: true },
				orderBy: { date: "asc" },
			},
			answers: {
				columns: { id: true, questionId: true, answer: true },
			},
		},
	});

	if (report == null) return null;

	const [chairs, questions] = await Promise.all([
		db
			.select({
				id: schema.personsToOrganisationalUnits.id,
				personName: schema.persons.name,
				roleType: schema.personRoleTypes.type,
			})
			.from(schema.personsToOrganisationalUnits)
			.innerJoin(
				schema.persons,
				eq(schema.persons.id, schema.personsToOrganisationalUnits.personId),
			)
			.innerJoin(
				schema.personRoleTypes,
				eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
			)
			.where(
				and(
					eq(schema.personsToOrganisationalUnits.organisationalUnitId, report.workingGroupId),
					inArray(schema.personRoleTypes.type, ["is_chair_of", "is_vice_chair_of"]),
					sql`
						${schema.personsToOrganisationalUnits.duration} && tstzrange (
							MAKE_DATE(${report.campaign.year}, 1, 1)::TIMESTAMPTZ,
							MAKE_DATE(${report.campaign.year + 1}, 1, 1)::TIMESTAMPTZ
						)
					`,
				),
			)
			.orderBy(schema.persons.sortName, schema.personRoleTypes.type),
		db.query.workingGroupReportQuestions.findMany({
			where: { campaignId: report.campaignId },
			columns: { id: true, question: true, position: true },
			orderBy: { position: "asc" },
		}),
	]);

	const answerMap = new Map(
		report.answers.map((a) => {
			return [a.questionId, a.answer];
		}),
	);

	return {
		id: report.id,
		status: report.status,
		workingGroup: report.workingGroup,
		campaign: report.campaign,
		summary: {
			numberOfMembers: report.numberOfMembers,
			mailingList: report.mailingList,
			chairs,
			socialMedia: report.socialMedia,
			events: report.events,
			questions: questions.map((q) => {
				return {
					id: q.id,
					question: q.question,
					answer: answerMap.get(q.id) ?? null,
				};
			}),
		},
	};
}
