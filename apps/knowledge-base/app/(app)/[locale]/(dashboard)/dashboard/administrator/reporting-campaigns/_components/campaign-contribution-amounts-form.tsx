"use client";

import type * as schema from "@dariah-eric/database/schema";
import { reportingCampaignContributionRoleEnum } from "@dariah-eric/database/schema";
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
import { useCompensationRoleLabel } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/contribution-role-labels";
import type { ServerAction } from "@/lib/server/create-server-action";

interface CampaignContributionAmountsFormProps {
	campaignId: string;
	amounts: Array<Pick<schema.ReportingCampaignContributionAmount, "roleType" | "amount">>;
	formAction: ServerAction;
	/** Closed campaigns are read-only. */
	isLocked?: boolean;
}

export function CampaignContributionAmountsForm(
	props: Readonly<CampaignContributionAmountsFormProps>,
): ReactNode {
	const { campaignId, amounts, formAction, isLocked = false } = props;

	const t = useExtracted();
	const getCompensationRoleLabel = useCompensationRoleLabel();
	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const amountMap = Object.fromEntries(amounts.map((a) => [a.roleType, String(a.amount)]));

	return (
		<FormLayout variant="stacked">
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<input name="id" type="hidden" value={campaignId} />

				<fieldset className="flex flex-col gap-y-6 min-inline-0" disabled={isLocked}>
					<FormSection title={t("Contribution amounts")}>
						{reportingCampaignContributionRoleEnum.map((role) => (
							<TextField key={role} defaultValue={amountMap[role]} name={role} type="number">
								<Label>{getCompensationRoleLabel(role)}</Label>
								<Input min={0} step="0.01" />
								<FieldError />
							</TextField>
						))}
					</FormSection>
				</fieldset>

				{!isLocked && (
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
				)}

				<FormStatus className="self-start" state={state} />
			</Form>
		</FormLayout>
	);
}
