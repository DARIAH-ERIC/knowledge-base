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

type ServiceSize = Pick<
	schema.ReportingCampaignServiceSize,
	"serviceSize" | "visitsThreshold" | "amount"
>;

interface CampaignServiceSizesFormProps {
	campaignId: string;
	sizes: Array<ServiceSize>;
	/** The latest campaign before this one, if any. */
	previous: { year: number; sizes: Array<ServiceSize> } | null;
	formAction: ServerAction;
	/** Closed campaigns are read-only. */
	isLocked?: boolean;
}

/** Keys the rows like the form's inputs. */
function toFieldValues(rows: Array<ServiceSize>): CampaignFieldValues {
	const values: CampaignFieldValues = {};
	for (const row of rows) {
		values[`${row.serviceSize}_amount`] = String(row.amount);
		if (row.visitsThreshold != null) {
			values[`${row.serviceSize}_threshold`] = String(row.visitsThreshold);
		}
	}
	return values;
}

export function CampaignServiceSizesForm(
	props: Readonly<CampaignServiceSizesFormProps>,
): ReactNode {
	const { campaignId, sizes, previous, formAction, isLocked = false } = props;

	const t = useExtracted();
	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const previousValues =
		previous != null ? { year: previous.year, values: toFieldValues(previous.sizes) } : null;
	const { containerRef, fieldsKey, defaultValues, copiedCount, copy } = useCopyFromPreviousCampaign(
		toFieldValues(sizes),
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
					<FormSection title={t("Tiered service sizes")}>
						<CampaignAmountField
							defaultValue={defaultValues["small_threshold"]}
							kind="count"
							label={t("Small: visits threshold")}
							name={"small_threshold"}
							previous={previousValues}
						/>

						<CampaignAmountField
							defaultValue={defaultValues["small_amount"]}
							label={t("Small: amount")}
							name={"small_amount"}
							previous={previousValues}
						/>

						<CampaignAmountField
							defaultValue={defaultValues["medium_threshold"]}
							kind="count"
							label={t("Medium: visits threshold")}
							name={"medium_threshold"}
							previous={previousValues}
						/>

						<CampaignAmountField
							defaultValue={defaultValues["medium_amount"]}
							label={t("Medium: amount")}
							name={"medium_amount"}
							previous={previousValues}
						/>

						<CampaignAmountField
							defaultValue={defaultValues["large_threshold"]}
							kind="count"
							label={t("Large: visits threshold")}
							name={"large_threshold"}
							previous={previousValues}
						/>

						<CampaignAmountField
							defaultValue={defaultValues["large_amount"]}
							label={t("Large: amount")}
							name={"large_amount"}
							previous={previousValues}
						/>

						<CampaignAmountField
							defaultValue={defaultValues["very_large_threshold"]}
							kind="count"
							label={t("Very large: visits threshold")}
							name={"very_large_threshold"}
							previous={previousValues}
						/>

						<CampaignAmountField
							defaultValue={defaultValues["very_large_amount"]}
							label={t("Very large: amount")}
							name={"very_large_amount"}
							previous={previousValues}
						/>
					</FormSection>

					<FormSection title={t("Core services")}>
						<CampaignAmountField
							defaultValue={defaultValues["core_amount"]}
							label={t("Core service amount")}
							name={"core_amount"}
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
