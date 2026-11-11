"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { RichTextEditor } from "@dariah-eric/ui/rich-text-editor";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState } from "react";

import { ActionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/action-form";
import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { copyWorkingGroupReportQuestionsAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/copy-working-group-report-questions.action";
import { deleteWorkingGroupReportQuestionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/delete-working-group-report-question.action";
import type { ServerAction } from "@/lib/server/create-server-action";

interface CampaignQuestionsFormProps {
	campaignId: string;
	questions: Array<Pick<schema.WorkingGroupReportQuestion, "id" | "question" | "position">>;
	createAction: ServerAction;
	/** The latest campaign before this one and how many questions it had, if any. */
	previous: { year: number; questionCount: number } | null;
	/** Closed campaigns are read-only. */
	isLocked?: boolean;
}

export function CampaignQuestionsForm(props: Readonly<CampaignQuestionsFormProps>): ReactNode {
	const { campaignId, questions, createAction, previous, isLocked = false } = props;

	const t = useExtracted();
	const [state, action, isPending] = useActionState(createAction, createActionStateInitial());

	return (
		<div className="flex flex-col gap-y-8 max-inline-3xl">
			{questions.length === 0 ? (
				<div className="flex flex-col items-start gap-y-3">
					<p className="text-sm text-muted-fg">{t("No questions yet.")}</p>
					{!isLocked && previous != null && previous.questionCount > 0 && (
						<ActionForm action={copyWorkingGroupReportQuestionsAction}>
							{(isPending) => (
								<Fragment>
									<input name="campaignId" type="hidden" value={campaignId} />
									<Button intent="secondary" isPending={isPending} size="sm" type="submit">
										{t("Copy {count} questions from {year}", {
											count: String(previous.questionCount),
											year: String(previous.year),
										})}
									</Button>
								</Fragment>
							)}
						</ActionForm>
					)}
				</div>
			) : (
				<ol className="flex flex-col gap-y-4">
					{questions.map((q) => (
						<li key={q.id} className="flex items-start gap-x-4 rounded-md border border-border p-4">
							<div className="flex-1 space-y-2">
								<span className="text-xs text-muted-fg">
									{t("Question")} {q.position}
								</span>
								<div className="rounded-md border border-border bg-muted/30 p-4">
									<RichTextEditor content={q.question} isEditable={false} size="sm" />
								</div>
							</div>

							{!isLocked && (
								<ActionForm action={deleteWorkingGroupReportQuestionAction}>
									{(isPending) => (
										<Fragment>
											<input name="campaignId" type="hidden" value={campaignId} />
											<input name="id" type="hidden" value={q.id} />
											<Button
												isPending={isPending}
												className="text-danger hover:text-danger"
												intent="secondary"
												size="sm"
												type="submit"
											>
												{t("Remove")}
											</Button>
										</Fragment>
									)}
								</ActionForm>
							)}
						</li>
					))}
				</ol>
			)}

			{!isLocked && (
				<FormLayout variant="stacked">
					<Form
						action={action}
						className="flex flex-col gap-y-6"
						resetOnSuccess={true}
						state={state}
					>
						<input name="campaignId" type="hidden" value={campaignId} />

						<FormSection title={t("Add question")}>
							<RichTextEditor aria-label={t("Question")} name="question" />
						</FormSection>

						<Button className="self-start" isPending={isPending} type="submit">
							{isPending ? (
								<Fragment>
									<ProgressCircle aria-label={t("Adding...")} isIndeterminate={true} />
									<span aria-hidden={true}>{t("Adding...")}</span>
								</Fragment>
							) : (
								t("Add")
							)}
						</Button>

						<FormStatus className="self-start" state={state} />
					</Form>
				</FormLayout>
			)}
		</div>
	);
}
