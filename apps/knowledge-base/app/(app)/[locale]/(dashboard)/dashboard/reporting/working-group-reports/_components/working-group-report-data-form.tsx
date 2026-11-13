"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { NumberField } from "@dariah-eric/ui/number-field";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState } from "react";

import { countFormatOptions } from "@/lib/number-format-options";
import type { ServerAction } from "@/lib/server/create-server-action";

interface WorkingGroupReportDataFormProps {
	report: Pick<schema.WorkingGroupReport, "id" | "numberOfMembers">;
	formAction: ServerAction;
}

export function WorkingGroupReportDataForm(
	props: Readonly<WorkingGroupReportDataFormProps>,
): ReactNode {
	const { report, formAction } = props;

	const t = useExtracted();
	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	return (
		<Form action={action} className="flex flex-col gap-y-4 max-inline-sm" state={state}>
			<input name="id" type="hidden" value={report.id} />

			<NumberField
				defaultValue={report.numberOfMembers ?? undefined}
				formatOptions={countFormatOptions}
				minValue={0}
				name="numberOfMembers"
			>
				<Label>{t("Number of members")}</Label>
				<Input />
				<FieldError />
			</NumberField>

			<Button className="self-start" isPending={isPending} type="submit">
				{isPending ? (
					<Fragment>
						<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
						<span aria-hidden={true}>{t("Saving...")}</span>
					</Fragment>
				) : (
					t("Save")
				)}
			</Button>

			<FormStatus className="self-start" state={state} />
		</Form>
	);
}
