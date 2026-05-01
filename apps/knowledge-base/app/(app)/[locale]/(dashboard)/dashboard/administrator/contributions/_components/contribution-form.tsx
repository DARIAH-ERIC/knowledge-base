"use client";

import { createActionStateInitial, isActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { DatePicker, DatePickerTrigger } from "@dariah-eric/ui/date-picker";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { parseDate } from "@internationalized/date";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useEffect, useMemo, useState } from "react";

import {
	FormActions,
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { ContributionOptionPicker } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/contributions/_components/contribution-option-picker";
import type { ContributionPersonOption, ContributionRoleOption } from "@/lib/data/contributions";
import { useRouter } from "@/lib/navigation/navigation";
import type { ServerAction } from "@/lib/server/create-server-action";

interface ContributionFormValues {
	id?: string;
	person: { id: string; name: string } | null;
	roleTypeId: string | null;
	organisationalUnit: { id: string; name: string } | null;
	durationStart: string | null;
	durationEnd: string | null;
}

interface ContributionFormProps {
	formAction: ServerAction;
	description: string;
	initialPersons?: Array<ContributionPersonOption>;
	initialPersonsTotal?: number;
	roleOptions: Array<ContributionRoleOption>;
	values?: ContributionFormValues;
}

function formatRoleType(type: string): string {
	return type.replaceAll("_", " ");
}

function formatRoleOptionLabel(option: ContributionRoleOption): string {
	const allowedTypes = option.allowedUnitTypes.map(formatRoleType).join(", ");

	return `${formatRoleType(option.roleType)} - ${allowedTypes}`;
}

function getValidationError(error: string | Array<string> | undefined): string | undefined {
	if (typeof error === "string") {
		return error;
	}

	return error?.[0];
}

export function ContributionForm(props: Readonly<ContributionFormProps>): ReactNode {
	const {
		formAction,
		description,
		initialPersons = [],
		initialPersonsTotal = 0,
		roleOptions,
		values,
	} = props;

	const t = useExtracted();
	const router = useRouter();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedPerson, setSelectedPerson] = useState<ContributionPersonOption | null>(
		values?.person ?? null,
	);
	const [selectedRoleTypeId, setSelectedRoleTypeId] = useState<string | null>(
		values?.roleTypeId ?? null,
	);
	const [selectedUnit, setSelectedUnit] = useState<{ id: string; name: string } | null>(
		values?.organisationalUnit ?? null,
	);

	const validationErrors = state.status === "error" ? state.validationErrors : undefined;
	const selectedRole = useMemo(() => {
		return (
			roleOptions.find((option) => {
				return option.roleTypeId === selectedRoleTypeId;
			}) ?? null
		);
	}, [roleOptions, selectedRoleTypeId]);

	useEffect(() => {
		if (!isActionStateSuccess(state)) {
			return;
		}

		router.push("/dashboard/administrator/person-relations");
		router.refresh();
	}, [router, state]);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection description={description} title={t("Details")} variant="stacked">
					<ContributionOptionPicker
						emptyMessage={t("No persons found.")}
						errorMessage={getValidationError(validationErrors?.personId)}
						initialItems={initialPersons}
						initialTotal={initialPersonsTotal}
						label={t("Person")}
						onSelect={setSelectedPerson}
						placeholder={t("Select a person")}
						resource="persons"
						selectedItem={selectedPerson}
					/>
					{values?.id != null ? <input name="id" type="hidden" value={values.id} /> : null}
					<input name="personId" type="hidden" value={selectedPerson?.id ?? ""} />

					<Select
						isRequired={true}
						onChange={(key) => {
							setSelectedRoleTypeId(String(key));
							setSelectedUnit(null);
						}}
						value={selectedRoleTypeId}
					>
						<Label>{t("Role")}</Label>
						<SelectTrigger />
						<FieldError />
						<SelectContent>
							{roleOptions.map((option) => {
								return (
									<SelectItem key={option.roleTypeId} id={option.roleTypeId}>
										{formatRoleOptionLabel(option)}
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>
					<input name="roleTypeId" type="hidden" value={selectedRoleTypeId ?? ""} />

					<ContributionOptionPicker
						key={`organisational-units:${selectedRoleTypeId ?? ""}`}
						emptyMessage={
							selectedRole != null ? t("No organisations found.") : t("Select a role first.")
						}
						errorMessage={getValidationError(validationErrors?.organisationalUnitId)}
						isDisabled={selectedRole == null}
						label={t("Organisation")}
						onSelect={setSelectedUnit}
						placeholder={
							selectedRole != null ? t("Select an organisation") : t("Select a role first")
						}
						resource="organisational-units"
						roleTypeId={selectedRoleTypeId}
						selectedItem={selectedUnit}
					/>
					<input name="organisationalUnitId" type="hidden" value={selectedUnit?.id ?? ""} />

					<DatePicker
						defaultValue={values?.durationStart != null ? parseDate(values.durationStart) : null}
						granularity="day"
						isRequired={true}
						name="duration.start"
					>
						<Label>{t("Start date")}</Label>
						<DatePickerTrigger />
						<FieldError />
					</DatePicker>

					<DatePicker
						defaultValue={values?.durationEnd != null ? parseDate(values.durationEnd) : null}
						granularity="day"
						name="duration.end"
					>
						<Label>{t("End date")}</Label>
						<DatePickerTrigger />
						<FieldError />
					</DatePicker>
				</FormSection>

				<FormActions>
					<FormStatus state={state} />
					<Button isPending={isPending} type="submit">
						{isPending ? (
							<Fragment>
								<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
								<span aria-hidden={true}>{t("Saving...")}</span>
							</Fragment>
						) : (
							t("Save")
						)}
					</Button>
				</FormActions>
			</Form>
		</FormLayout>
	);
}
