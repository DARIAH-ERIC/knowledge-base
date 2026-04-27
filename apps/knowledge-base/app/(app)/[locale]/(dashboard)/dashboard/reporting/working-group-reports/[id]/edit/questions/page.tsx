import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { WorkingGroupReportQuestionsForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_components/working-group-report-questions-form";
import { upsertWorkingGroupReportAnswersAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/working-group-reports/_lib/upsert-working-group-report-answers.action";
import { assertAuthenticated } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingWorkingGroupReportQuestionsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingWorkingGroupReportQuestionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Working group report questions"),
	});
}

export default async function DashboardReportingWorkingGroupReportQuestionsPage(
	props: Readonly<DashboardReportingWorkingGroupReportQuestionsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report] = await Promise.all([
		db.query.workingGroupReports.findFirst({
			where: { id },
			columns: { id: true, campaignId: true },
			with: {
				answers: {
					columns: { id: true, questionId: true, answer: true },
				},
			},
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	const questions = await db.query.workingGroupReportQuestions.findMany({
		where: { campaignId: report.campaignId },
		columns: { id: true, question: true, position: true },
		orderBy: { position: "asc" },
	});

	const t = await getExtracted();

	if (questions.length === 0) {
		return (
			<p className="text-sm text-muted-fg">
				{t("No questions have been added for this campaign yet.")}
			</p>
		);
	}

	const answerMap = new Map(
		report.answers.map((a) => {
			return [a.questionId, a.answer];
		}),
	);

	return (
		<WorkingGroupReportQuestionsForm
			answerMap={Object.fromEntries(answerMap)}
			formAction={upsertWorkingGroupReportAnswersAction}
			questions={questions}
			reportId={report.id}
		/>
	);
}
