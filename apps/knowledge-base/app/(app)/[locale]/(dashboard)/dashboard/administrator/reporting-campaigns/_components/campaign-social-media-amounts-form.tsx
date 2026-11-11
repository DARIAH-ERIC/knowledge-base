"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import {
	CampaignAmountField,
	type CampaignFieldValues,
	CopyFromPreviousCampaignButton,
	useCopyFromPreviousCampaign,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_components/campaign-amount-field";
import type { ServerAction } from "@/lib/server/create-server-action";

type SocialMediaAmount = Pick<schema.ReportingCampaignSocialMediaAmount, "category" | "amount">;

interface CampaignSocialMediaAmountsFormProps {
	campaignId: string;
	amounts: Array<SocialMediaAmount>;
	/** The latest campaign before this one, if any. */
	previous: { year: number; amounts: Array<SocialMediaAmount> } | null;
	formAction: ServerAction;
	/** Closed campaigns are read-only. */
	isLocked?: boolean;
}

/** Keys the rows like the form's inputs. */
function toFieldValues(rows: Array<SocialMediaAmount>): CampaignFieldValues {
	return Object.fromEntries(rows.map((row) => [row.category, String(row.amount)]));
}

export function CampaignSocialMediaAmountsForm(
	props: Readonly<CampaignSocialMediaAmountsFormProps>,
): ReactNode {
	const { campaignId, amounts, previous, formAction, isLocked = false } = props;

	const t = useExtracted();
	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const previousValues =
		previous != null ? { year: previous.year, values: toFieldValues(previous.amounts) } : null;
	const { containerRef, fieldsKey, defaultValues, copiedCount, copy } = useCopyFromPreviousCampaign(
		toFieldValues(amounts),
		previousValues,
	);

	return (
		<FormLayout variant="stacked">
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<input name="id" type="hidden" value={campaignId} />

				{!isLocked && (
					<CopyFromPreviousCampaignButton
						copiedCount={copiedCount}
						onCopy={copy}
						previous={previousValues}
					/>
				)}

				<fieldset
					key={fieldsKey}
					ref={containerRef}
					className="flex flex-col gap-y-6 min-inline-0"
					disabled={isLocked}
				>
					<FormSection title={t("Social media amounts")}>
						<CampaignAmountField
							defaultValue={defaultValues["website"]}
							label={t("Website")}
							name={"website"}
							previous={previousValues}
						/>

						<CampaignAmountField
							defaultValue={defaultValues["other"]}
							label={t("Other")}
							name={"other"}
							previous={previousValues}
						/>
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
