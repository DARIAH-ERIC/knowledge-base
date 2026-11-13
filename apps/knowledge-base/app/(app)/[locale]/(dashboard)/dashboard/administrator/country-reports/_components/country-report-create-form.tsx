"use client";

import type * as schema from "@dariah-eric/database/schema";
import { reportStatusEnum } from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { Description, FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import {
	SearchableSelect,
	SearchableSelectContent,
	SearchableSelectInput,
	SearchableSelectItem,
} from "@dariah-eric/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { createCountryReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/country-reports/_lib/create-country-report.action";

interface CountryReportCreateFormProps {
	/** Open campaigns, each with the countrys that may still get a report in it. */
	campaigns: Array<
		Pick<schema.ReportingCampaign, "id" | "year"> & {
			countries: Array<Pick<schema.OrganisationalUnit, "id" | "name">>;
		}
	>;
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export function CountryReportCreateForm(props: Readonly<CountryReportCreateFormProps>): ReactNode {
	const { campaigns } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(
		createCountryReportAction,
		createActionStateInitial(),
	);

	const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaigns[0]?.id ?? "");
	const [selectedCountryId, setSelectedCountryId] = useState<string>("");
	const [selectedStatus, setSelectedStatus] = useState<string>("draft");

	const countries =
		campaigns.find((campaign) => campaign.id === selectedCampaignId)?.countries ?? [];

	return (
		<Fragment>
			<EntityFormHeader title={t("New country report")} />

			<FormLayout>
				<Form action={action} className="flex flex-col gap-y-6" state={state}>
					<FormSection
						description={t("Select the campaign and country for this report.")}
						title={t("Details")}
					>
						<Select
							isRequired={true}
							onChange={(key) => {
								setSelectedCampaignId(key == null ? "" : String(key));
								// The countrys that may still get a report differ per campaign.
								setSelectedCountryId("");
							}}
							value={selectedCampaignId || null}
						>
							<Label>{t("Campaign")}</Label>
							<SelectTrigger />
							<FieldError />
							<SelectContent>
								{campaigns.map((campaign) => (
									<SelectItem key={campaign.id} id={campaign.id}>
										{campaign.year}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<input name="campaignId" type="hidden" value={selectedCampaignId} />

						<SearchableSelect
							isRequired={true}
							onChange={(key) => {
								setSelectedCountryId(key == null ? "" : String(key));
							}}
							value={selectedCountryId || null}
						>
							<Label>{t("Country")}</Label>
							<SearchableSelectInput placeholder={t("Search countries...")} />
							{selectedCampaignId !== "" && countries.length === 0 && (
								<Description>
									{t("Every country that reports for this campaign already has a report.")}
								</Description>
							)}
							<FieldError />
							<SearchableSelectContent>
								{countries.map((country) => (
									<SearchableSelectItem key={country.id} id={country.id} textValue={country.name}>
										{country.name}
									</SearchableSelectItem>
								))}
							</SearchableSelectContent>
						</SearchableSelect>
						<input name="countryId" type="hidden" value={selectedCountryId} />

						<Select
							isRequired={true}
							onChange={(key) => {
								setSelectedStatus(key == null ? "" : String(key));
							}}
							value={selectedStatus || null}
						>
							<Label>{t("Status")}</Label>
							<SelectTrigger />
							<FieldError />
							<SelectContent>
								{reportStatusEnum.map((status) => (
									<SelectItem key={status} id={status}>
										{formatStatus(status)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<input name="status" type="hidden" value={selectedStatus} />
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
		</Fragment>
	);
}
