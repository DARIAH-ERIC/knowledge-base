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
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { countFormatOptions } from "@/lib/number-format-options";
import type { ServerAction } from "@/lib/server/create-server-action";

interface CountryReportEventsFormProps {
	report: Pick<
		schema.CountryReport,
		| "id"
		| "smallEvents"
		| "mediumEvents"
		| "largeEvents"
		| "veryLargeEvents"
		| "dariahCommissionedEvent"
		| "reusableOutcomes"
	>;
	formAction: ServerAction;
}

export function CountryReportEventsForm(props: Readonly<CountryReportEventsFormProps>): ReactNode {
	const { report, formAction } = props;

	const t = useExtracted();
	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	return (
		<FormLayout variant="stacked">
			<Form action={action} className="flex flex-col gap-y-12" state={state}>
				<input name="id" type="hidden" value={report.id} />

				<FormSection title={t("Event counts")}>
					<NumberField
						defaultValue={report.smallEvents ?? undefined}
						formatOptions={countFormatOptions}
						minValue={0}
						name="smallEvents"
					>
						<Label>{t("Small events")}</Label>
						<Input />
						<FieldError />
					</NumberField>

					<NumberField
						defaultValue={report.mediumEvents ?? undefined}
						formatOptions={countFormatOptions}
						minValue={0}
						name="mediumEvents"
					>
						<Label>{t("Medium events")}</Label>
						<Input />
						<FieldError />
					</NumberField>

					<NumberField
						defaultValue={report.largeEvents ?? undefined}
						formatOptions={countFormatOptions}
						minValue={0}
						name="largeEvents"
					>
						<Label>{t("Large events")}</Label>
						<Input />
						<FieldError />
					</NumberField>

					<NumberField
						defaultValue={report.veryLargeEvents ?? undefined}
						formatOptions={countFormatOptions}
						minValue={0}
						name="veryLargeEvents"
					>
						<Label>{t("Very large events")}</Label>
						<Input />
						<FieldError />
					</NumberField>
				</FormSection>

				<FormSection title={t("DARIAH commissioned event")}>
					<TextField
						defaultValue={report.dariahCommissionedEvent ?? undefined}
						name="dariahCommissionedEvent"
					>
						<Label>{t("Title")}</Label>
						<Input />
						<FieldError />
					</TextField>
				</FormSection>

				<FormSection title={t("Reusable outcomes")}>
					<TextField defaultValue={report.reusableOutcomes ?? undefined} name="reusableOutcomes">
						<Label>{t("Description")}</Label>
						<TextArea rows={5} />
						<FieldError />
					</TextField>
				</FormSection>

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
		</FormLayout>
	);
}
