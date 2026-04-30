"use client";

import {
	type ActionState,
	createActionStateInitial,
	type GetValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { DatePicker, DatePickerTrigger } from "@dariah-eric/ui/date-picker";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import {
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@dariah-eric/ui/modal";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { Separator } from "@dariah-eric/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { ArchiveBoxXMarkIcon } from "@heroicons/react/24/outline";
import { type CalendarDate, getLocalTimeZone } from "@internationalized/date";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, startTransition, useState, useTransition } from "react";

import {
	FormLayout,
	FormSection,
	FormSectionTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { createContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-contribution.action";
import type { CreateContributionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-contribution.schema";
import { endContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/end-contribution.action";
import { ContributionOptionPicker } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/contributions/_components/contribution-option-picker";
import type { ContributionPersonOption } from "@/lib/data/contributions";
import type { PersonRelation, PersonRelationRoleOption } from "@/lib/data/person-relations";

interface PersonRelationsSectionProps {
	unitId: string;
	relations: Array<PersonRelation>;
	roleOptions: Array<PersonRelationRoleOption>;
	initialPersonItems: Array<ContributionPersonOption>;
	initialPersonTotal: number;
}

type ContributionValidationErrors = GetValidationErrors<typeof CreateContributionActionInputSchema>;

function formatRoleType(type: string): string {
	return type.replaceAll("_", " ");
}

export function PersonRelationsSection(props: Readonly<PersonRelationsSectionProps>): ReactNode {
	const { unitId, relations, roleOptions, initialPersonItems, initialPersonTotal } = props;

	const t = useExtracted();
	const format = useFormatter();

	const [localRelations, setLocalRelations] = useState(relations);
	const [itemToEnd, setItemToEnd] = useState<{ id: string } | null>(null);
	const [selectedEndDate, setSelectedEndDate] = useState<CalendarDate | null>(null);

	const [selectedRoleTypeId, setSelectedRoleTypeId] = useState<string | null>(null);
	const [selectedPerson, setSelectedPerson] = useState<ContributionPersonOption | null>(null);

	const [state, setState] = useState<ActionState>(() => {
		return createActionStateInitial();
	});
	const [isPending, startFormTransition] = useTransition();

	const validationErrors =
		state.status === "error"
			? (state.validationErrors as ContributionValidationErrors | undefined)
			: undefined;
	const selectedRoleOption = roleOptions.find((option) => {
		return option.roleTypeId === selectedRoleTypeId;
	});

	function formAction(formData: FormData) {
		const person = selectedPerson;
		const option = selectedRoleOption;

		startFormTransition(async () => {
			const newState = await createContributionAction(state, formData);
			setState(newState);

			if (newState.status === "success" && option != null && person != null) {
				const data = newState.data as
					| { id: string; durationStart: string; durationEnd: string | null }
					| undefined;

				if (data != null) {
					setLocalRelations((prev) => {
						return [
							...prev,
							{
								id: data.id,
								personId: person.id,
								personName: person.name,
								roleTypeId: option.roleTypeId,
								roleType: option.roleType as PersonRelation["roleType"],
								duration: {
									start: new Date(data.durationStart),
									...(data.durationEnd != null ? { end: new Date(data.durationEnd) } : {}),
								},
							},
						];
					});
				}

				setSelectedRoleTypeId(null);
				setSelectedPerson(null);
			}
		});
	}

	return (
		<Fragment>
			<Separator className="my-8" />

			<div className="max-w-3xl space-y-6">
				<div className="space-y-1">
					<FormSectionTitle title={t("People")} />
				</div>

				{localRelations.length > 0 ? (
					<Table aria-label="people" className="[--gutter:0] sm:[--gutter:0]">
						<TableHeader>
							<TableColumn isRowHeader={true}>{t("Person")}</TableColumn>
							<TableColumn>{t("Role")}</TableColumn>
							<TableColumn>{t("From")}</TableColumn>
							<TableColumn>{t("Until")}</TableColumn>
							<TableColumn />
						</TableHeader>
						<TableBody items={localRelations}>
							{(relation) => {
								return (
									<TableRow id={relation.id}>
										<TableCell>{relation.personName}</TableCell>
										<TableCell>{formatRoleType(relation.roleType)}</TableCell>
										<TableCell>
											{format.dateTime(relation.duration.start, { dateStyle: "short" })}
										</TableCell>
										<TableCell>
											{relation.duration.end != null
												? format.dateTime(relation.duration.end, { dateStyle: "short" })
												: t("present")}
										</TableCell>
										<TableCell className="text-end">
											{relation.duration.end == null && (
												<Button
													aria-label={t("End person relation")}
													className="h-7 sm:h-7"
													intent="plain"
													onPress={() => {
														setItemToEnd({ id: relation.id });
														setSelectedEndDate(null);
													}}
													size="sq-sm"
												>
													<ArchiveBoxXMarkIcon className="size-4" />
												</Button>
											)}
										</TableCell>
									</TableRow>
								);
							}}
						</TableBody>
					</Table>
				) : (
					<p className="text-sm text-neutral-500">{t("No people assigned.")}</p>
				)}

				{roleOptions.length > 0 && (
					<FormLayout variant="stacked">
						<Form action={formAction} className="flex flex-col gap-y-6" state={state}>
							<FormSection
								description={t("Add a person to this organisational unit.")}
								title={t("Add person")}
								variant="stacked"
							>
								<Select
									isRequired={true}
									onChange={(key) => {
										setSelectedRoleTypeId(String(key));
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
													{formatRoleType(option.roleType)}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
								<input name="roleTypeId" type="hidden" value={selectedRoleTypeId ?? ""} />

								<ContributionOptionPicker
									emptyMessage={t("No persons found.")}
									errorMessage={
										typeof validationErrors?.personId === "string"
											? validationErrors.personId
											: undefined
									}
									initialItems={initialPersonItems}
									initialTotal={initialPersonTotal}
									label={t("Person")}
									onSelect={setSelectedPerson}
									placeholder={t("No person selected")}
									resource="persons"
									selectedItem={selectedPerson}
								/>
								<input name="personId" type="hidden" value={selectedPerson?.id ?? ""} />

								<DatePicker granularity="day" isRequired={true} name="duration.start">
									<Label>{t("Start date")}</Label>
									<DatePickerTrigger />
									<FieldError />
								</DatePicker>

								<DatePicker granularity="day" name="duration.end">
									<Label>{t("End date")}</Label>
									<DatePickerTrigger />
									<FieldError />
								</DatePicker>

								<input name="organisationalUnitId" type="hidden" value={unitId} />
							</FormSection>

							<Button className="self-start" isPending={isPending} type="submit">
								{isPending ? (
									<Fragment>
										<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
										<span aria-hidden={true}>{t("Saving...")}</span>
									</Fragment>
								) : (
									t("Add person")
								)}
							</Button>

							<FormStatus className="self-start" state={state} />
						</Form>
					</FormLayout>
				)}
			</div>

			<ModalContent
				isOpen={itemToEnd != null}
				onOpenChange={(open) => {
					if (!open) setItemToEnd(null);
				}}
				role="alertdialog"
				size="sm"
			>
				<ModalHeader
					description={t("Set the date on which this person relation ended.")}
					title={t("End person relation")}
				/>
				<ModalBody>
					<DatePicker
						granularity="day"
						onChange={(date) => {
							setSelectedEndDate(date);
						}}
						value={selectedEndDate}
					>
						<Label>{t("End date")}</Label>
						<DatePickerTrigger />
					</DatePicker>
				</ModalBody>
				<ModalFooter>
					<ModalClose>{t("Cancel")}</ModalClose>
					<Button
						isDisabled={selectedEndDate == null}
						onPress={() => {
							if (itemToEnd == null || selectedEndDate == null) return;

							const end = selectedEndDate.toDate(getLocalTimeZone());

							startTransition(async () => {
								await endContributionAction(itemToEnd.id, end);
								setLocalRelations((prev) => {
									return prev.map((relation) => {
										return relation.id === itemToEnd.id
											? { ...relation, duration: { ...relation.duration, end } }
											: relation;
									});
								});
								setItemToEnd(null);
							});
						}}
					>
						{t("Confirm")}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Fragment>
	);
}
