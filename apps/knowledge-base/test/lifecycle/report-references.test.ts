import { randomUUID } from "node:crypto";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { describe, expect, it } from "vitest";

import { assertNotReferencedByReports } from "@/lib/data/report-references";
import type { Transaction } from "@/lib/db";
import { withTransaction } from "@/test/lib/with-transaction";

type Tx = Transaction;

const question = { type: "doc", content: [] };

async function createWorkingGroupReport(tx: Tx): Promise<{
	campaignId: string;
	workingGroupReportId: string;
	workingGroupDocumentId: string;
}> {
	const type = await tx.query.entityTypes.findFirst({
		where: { type: "organisational_units" },
		columns: { id: true },
	});
	assert(type, "organisational_units entity type not found in database");

	const [workingGroup] = await tx
		.insert(schema.entities)
		.values({ slug: `report-references-test-${randomUUID()}`, typeId: type.id })
		.returning({ id: schema.entities.id });
	assert(workingGroup);

	const [campaign] = await tx
		.insert(schema.reportingCampaigns)
		.values({ year: 2_000_000 + Math.floor(Math.random() * 1_000_000) })
		.returning({ id: schema.reportingCampaigns.id });
	assert(campaign);

	const [report] = await tx
		.insert(schema.workingGroupReports)
		.values({ campaignId: campaign.id, workingGroupDocumentId: workingGroup.id })
		.returning({ id: schema.workingGroupReports.id });
	assert(report);

	return {
		campaignId: campaign.id,
		workingGroupReportId: report.id,
		workingGroupDocumentId: workingGroup.id,
	};
}

async function createQuestion(tx: Tx, campaignId: string, position: number): Promise<string> {
	const [row] = await tx
		.insert(schema.workingGroupReportQuestions)
		.values({ campaignId, question, position })
		.returning({ id: schema.workingGroupReportQuestions.id });
	assert(row);
	return row.id;
}

describe("assertNotReferencedByReports", () => {
	it("refuses a working group report question a report has answered", async () => {
		await withTransaction(async (tx) => {
			const { campaignId, workingGroupReportId } = await createWorkingGroupReport(tx);
			const answered = await createQuestion(tx, campaignId, 1);
			const unanswered = await createQuestion(tx, campaignId, 2);

			await tx
				.insert(schema.workingGroupReportAnswers)
				.values({ workingGroupReportId, questionId: answered, answer: question });

			await expect(
				assertNotReferencedByReports(tx, { type: "working_group_report_question", id: answered }),
			).rejects.toThrow("referenced-by-report");
			await expect(
				assertNotReferencedByReports(tx, {
					type: "working_group_report_question",
					id: unanswered,
				}),
			).resolves.toBeUndefined();
		});
	});

	it("refuses a document that any of its report tables points at", async () => {
		await withTransaction(async (tx) => {
			const { workingGroupDocumentId } = await createWorkingGroupReport(tx);

			await expect(
				assertNotReferencedByReports(tx, { type: "document", id: workingGroupDocumentId }),
			).rejects.toThrow("referenced-by-report");
			await expect(
				assertNotReferencedByReports(tx, { type: "document", id: randomUUID() }),
			).resolves.toBeUndefined();
		});
	});

	it("allows an empty set of contributions without querying", async () => {
		await withTransaction(async (tx) => {
			await expect(
				assertNotReferencedByReports(tx, { type: "contributions", ids: [] }),
			).resolves.toBeUndefined();
		});
	});
});
