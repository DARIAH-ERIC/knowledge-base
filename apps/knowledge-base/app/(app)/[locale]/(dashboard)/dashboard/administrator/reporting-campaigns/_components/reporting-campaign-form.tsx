"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { TextField } from "@dariah-eric/ui/text-field";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import type { ServerAction } from "@/lib/server/create-server-action";

interface ReportingCampaignFormProps {
	campaign?: Pick<schema.ReportingCampaign, "id" | "year">;
	/** Pre-filled year for a new campaign; ignored when editing an existing one. */
	defaultYear?: number;
	formAction: ServerAction;
}

export function ReportingCampaignForm(props: Readonly<ReportingCampaignFormProps>): ReactNode {
	const { campaign, defaultYear, formAction } = props;

	const year = campaign?.year ?? defaultYear;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection description={t("Enter the campaign details.")} title={t("Details")}>
					<TextField
						defaultValue={year != null ? String(year) : undefined}
						isRequired={true}
						name="year"
						type="number"
					>
						<Label>{t("Year")}</Label>
						<Input />
						<FieldError />
					</TextField>
				</FormSection>

				{campaign != null && <input name="id" type="hidden" value={campaign.id} />}

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
