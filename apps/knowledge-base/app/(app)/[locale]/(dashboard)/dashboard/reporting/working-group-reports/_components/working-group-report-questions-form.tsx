"use client";

import { Button } from "@dariah-eric/ui/button";
import { RichTextEditor } from "@dariah-eric/ui/rich-text-editor";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

interface Question {
	id: string;
	question: unknown;
	position: number;
}

interface WorkingGroupReportQuestionsFormProps {
	reportId: string;
	questions: Array<Question>;
	answerMap: Record<string, unknown>;
	formAction: (formData: FormData) => Promise<void>;
}

export function WorkingGroupReportQuestionsForm(
	props: Readonly<WorkingGroupReportQuestionsFormProps>,
): ReactNode {
	const { reportId, questions, answerMap, formAction } = props;

	const t = useExtracted();

	return (
		<form action={formAction} className="flex flex-col gap-y-8">
			<input name="id" type="hidden" value={reportId} />

			{questions.map((question) => {
				const existingAnswer = answerMap[question.id];

				return (
					<section key={question.id} className="flex flex-col gap-y-4">
						<div className="rounded-md border border-border bg-muted/30 p-4">
							<RichTextEditor
								aria-label={`Question ${String(question.position)}`}
								content={question.question as JSONContent}
								isEditable={false}
							/>
						</div>
						<RichTextEditor
							aria-label={`Answer to question ${String(question.position)}`}
							content={existingAnswer != null ? (existingAnswer as JSONContent) : undefined}
							name={`answers.${question.id}`}
						/>
					</section>
				);
			})}

			<div>
				<Button type="submit">{t("Save")}</Button>
			</div>
		</form>
	);
}
