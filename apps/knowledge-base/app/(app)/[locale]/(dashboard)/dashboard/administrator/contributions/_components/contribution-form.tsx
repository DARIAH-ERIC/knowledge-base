"use client";

import { createActionStateInitial, isActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { AsyncSelect } from "@dariah-eric/ui/async-select";
import { DatePicker, DatePickerTrigger } from "@dariah-eric/ui/date-picker";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import type { AsyncOption, AsyncOptionsFetchPageParams } from "@dariah-eric/ui/use-async-options";
import { parseDate } from "@internationalized/date";
import { useExtracted } from "next-intl";
import { type ReactNode, useActionState, useEffect, useMemo, useState } from "react";

import { EntityFormActions } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form-actions";
import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import type { ContributionRoleOption } from "@/lib/data/contributions";
import { useRouter } from "@/lib/navigation/navigation";
import type { ServerAction } from "@/lib/server/create-server-action";

async function fetchPersonOptionsPage(
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<AsyncOption>; total: number }> {
	const searchParams = new URLSearchParams({
		limit: String(params.limit),
		offset: String(params.offset),
		resource: "persons",
	});

	if (params.q !== "") {
		searchParams.set("q", params.q);
	}

	const response = await fetch(`/api/contributions/options?${searchParams.toString()}`, {
		signal: params.signal,
	});

	if (!response.ok) {
		throw new Error("Failed to load persons.");
	}

	return (await response.json()) as { items: Array<AsyncOption>; total: number };
}

async function fetchOrganisationalUnitOptionsPage(
	roleTypeId: string,
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<AsyncOption>; total: number }> {
	const searchParams = new URLSearchParams({
		limit: String(params.limit),
		offset: String(params.offset),
		resource: "organisational-units",
		roleTypeId,
	});

	if (params.q !== "") {
		searchParams.set("q", params.q);
	}

	const response = await fetch(`/api/contributions/options?${searchParams.toString()}`, {
		signal: params.signal,
	});

	if (!response.ok) {
		throw new Error("Failed to load organisations.");
	}

	return (await response.json()) as { items: Array<AsyncOption>; total: number };
}

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
	initialPersons?: Array<AsyncOption>;
	initialPersonsTotal?: number;
	roleOptions: Array<ContributionRoleOption>;
	values?: ContributionFormValues;
	showSaveAndPublish?: boolean;
}

function formatRoleType(type: string): string {
	return type.replaceAll("_", " ");
}

function formatRoleOptionLabel(option: ContributionRoleOption): string {
	const allowedTypes = option.allowedUnitTypes.map(formatRoleType).join(", ");

	return `${formatRoleType(option.roleType)} - ${allowedTypes}`;
}

function getValidationError(error: string | ReadonlyArray<string> | undefined): string | undefined {
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
		showSaveAndPublish,
	} = props;

	const t = useExtracted();
	const router = useRouter();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedPerson, setSelectedPerson] = useState<AsyncOption | null>(values?.person ?? null);
	const [selectedRoleTypeId, setSelectedRoleTypeId] = useState<string | null>(
		values?.roleTypeId ?? null,
	);
	const [selectedUnit, setSelectedUnit] = useState<AsyncOption | null>(
		values?.organisationalUnit ?? null,
	);

	const validationErrors = state.status === "error" ? state.validationErrors : undefined;
	const selectedRole = useMemo(
		() => roleOptions.find((option) => option.roleTypeId === selectedRoleTypeId) ?? null,
		[roleOptions, selectedRoleTypeId],
	);

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
					<AsyncSelect
						aria-label={t("Person")}
						emptyMessage={t("No persons found.")}
						errorMessage={getValidationError(validationErrors?.personId)}
						fetchPage={fetchPersonOptionsPage}
						initialItems={initialPersons}
						initialTotal={initialPersonsTotal}
						label={t("Person")}
						onSelect={setSelectedPerson}
						placeholder={t("Select a person")}
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
							{roleOptions.map((option) => (
								<SelectItem key={option.roleTypeId} id={option.roleTypeId}>
									{formatRoleOptionLabel(option)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<input name="roleTypeId" type="hidden" value={selectedRoleTypeId ?? ""} />

					<AsyncSelect
						aria-label={t("Organisation")}
						cacheKey={selectedRoleTypeId ?? "none"}
						emptyMessage={
							selectedRole != null ? t("No organisations found.") : t("Select a role first.")
						}
						errorMessage={getValidationError(validationErrors?.organisationalUnitId)}
						fetchPage={(params) => {
							if (selectedRoleTypeId == null) {
								return Promise.resolve({ items: [], total: 0 });
							}

							return fetchOrganisationalUnitOptionsPage(selectedRoleTypeId, params);
						}}
						initialItems={[]}
						initialTotal={0}
						isDisabled={selectedRole == null}
						label={t("Organisation")}
						loadOnMount={selectedRoleTypeId != null}
						onSelect={setSelectedUnit}
						placeholder={
							selectedRole != null ? t("Select an organisation") : t("Select a role first")
						}
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

				<EntityFormActions
					entityName={t("Contribution")}
					isPending={isPending}
					showSaveAndPublish={showSaveAndPublish}
					state={state}
				/>
			</Form>
		</FormLayout>
	);
}
