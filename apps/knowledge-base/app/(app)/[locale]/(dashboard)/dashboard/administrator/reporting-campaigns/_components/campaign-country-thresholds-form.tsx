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

interface Country {
	id: string;
	name: string;
}

type CountryThreshold = Pick<
	schema.ReportingCampaignCountryThreshold,
	"countryDocumentId" | "amount"
>;

interface CampaignCountryThresholdsFormProps {
	campaignId: string;
	countries: Array<Country>;
	thresholds: Array<CountryThreshold>;
	/** The latest campaign before this one, if any. */
	previous: { year: number; thresholds: Array<CountryThreshold> } | null;
	formAction: ServerAction;
	/** Closed campaigns are read-only. */
	isLocked?: boolean;
}

function getFieldName(countryDocumentId: string): string {
	return `amounts.${countryDocumentId}`;
}

/** Keys the rows like the form's inputs. */
function toFieldValues(rows: Array<CountryThreshold>): CampaignFieldValues {
	return Object.fromEntries(
		rows.map((row) => [getFieldName(row.countryDocumentId), String(row.amount)]),
	);
}

export function CampaignCountryThresholdsForm(
	props: Readonly<CampaignCountryThresholdsFormProps>,
): ReactNode {
	const { campaignId, countries, thresholds, previous, formAction, isLocked = false } = props;

	const t = useExtracted();
	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const previousValues =
		previous != null ? { year: previous.year, values: toFieldValues(previous.thresholds) } : null;
	const { containerRef, fieldsKey, defaultValues, copiedCount, copy } = useCopyFromPreviousCampaign(
		toFieldValues(thresholds),
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
					<FormSection title={t("Country thresholds")}>
						{countries.map((country) => (
							<CampaignAmountField
								key={country.id}
								defaultValue={defaultValues[getFieldName(country.id)]}
								label={country.name}
								name={getFieldName(country.id)}
								previous={previousValues}
							/>
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
