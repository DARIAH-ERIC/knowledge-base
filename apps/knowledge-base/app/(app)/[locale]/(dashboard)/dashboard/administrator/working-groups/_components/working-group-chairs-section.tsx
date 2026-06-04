"use client";

import { type ActionState, createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { AsyncSelect } from "@dariah-eric/ui/async-select";
import { Badge } from "@dariah-eric/ui/badge";
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
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { Tooltip, TooltipContent } from "@dariah-eric/ui/tooltip";
import type { AsyncOptionsFetchPageParams } from "@dariah-eric/ui/use-async-options";
import { ArchiveBoxXMarkIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { type CalendarDate, getLocalTimeZone, parseDate } from "@internationalized/date";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, startTransition, useState, useTransition } from "react";

import {
	FormLayout,
	FormSection,
	FormSectionTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { createWorkingGroupChairAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/create-working-group-chair.action";
import { deleteWorkingGroupChairAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/delete-working-group-chair.action";
import { endWorkingGroupChairAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/end-working-group-chair.action";
import { updateWorkingGroupChairAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/update-working-group-chair.action";
import type { AvailablePerson } from "@/lib/data/article-contributors";
import type { WorkingGroupChair } from "@/lib/data/working-group-chairs";

interface WorkingGroupChairsSectionProps {
	unitId: string;
	chairs: Array<WorkingGroupChair & { lifecycleStatus?: "changed" | "new" }>;
	initialPersonItems: Array<AvailablePerson>;
	initialPersonTotal: number;
}

function formatLifecycleStatus(
	status: "changed" | "new",
	t: ReturnType<typeof useExtracted>,
): string {
	return status === "new" ? t("New") : t("Changed");
}

function dateToCalendarDate(date: Date | undefined): CalendarDate | null {
	return date != null ? parseDate(date.toISOString().slice(0, 10)) : null;
}

async function fetchPersonOptionsPage(
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<AvailablePerson>; total: number }> {
	const searchParams = new URLSearchParams({
		limit: String(params.limit),
		offset: String(params.offset),
		resource: "persons",
	});

	if (params.q !== "") {
		searchParams.set("q", params.q);
	}

	// person↔org relations are document-level; this endpoint returns person *document* ids.
	const response = await fetch(`/api/contributions/options?${searchParams.toString()}`, {
		signal: params.signal,
	});

	if (!response.ok) {
		throw new Error("Failed to load persons.");
	}

	return (await response.json()) as { items: Array<AvailablePerson>; total: number };
}

export function WorkingGroupChairsSection(
	props: Readonly<WorkingGroupChairsSectionProps>,
): ReactNode {
	const { unitId, chairs, initialPersonItems, initialPersonTotal } = props;

	const t = useExtracted();
	const format = useFormatter();

	const [localChairs, setLocalChairs] = useState(() => chairs);
	const [itemToEnd, setItemToEnd] = useState<{ id: string } | null>(null);
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
	const [selectedEndDate, setSelectedEndDate] = useState<CalendarDate | null>(null);

	const [selectedPerson, setSelectedPerson] = useState<AvailablePerson | null>(null);

	const [itemToEdit, setItemToEdit] = useState<WorkingGroupChair | null>(null);
	const [editPerson, setEditPerson] = useState<AvailablePerson | null>(null);
	const [editStartDate, setEditStartDate] = useState<CalendarDate | null>(null);
	const [editEndDate, setEditEndDate] = useState<CalendarDate | null>(null);

	const [state, setState] = useState<ActionState>(() => createActionStateInitial());
	const [editState, setEditState] = useState<ActionState>(() => createActionStateInitial());
	const [isPending, startFormTransition] = useTransition();
	const [isEditPending, startEditTransition] = useTransition();

	const editValidationErrors =
		editState.status === "error" ? editState.validationErrors : undefined;

	function formAction(formData: FormData) {
		const person = selectedPerson;

		startFormTransition(async () => {
			const newState = await createWorkingGroupChairAction(state, formData);
			setState(newState);

			if (newState.status === "success" && person != null) {
				const data = newState.data as
					| { id: string; durationStart: string; durationEnd: string | null }
					| undefined;

				if (data != null) {
					setLocalChairs((prev) => [
						...prev,
						{
							id: data.id,
							personId: person.id,
							personName: person.name,
							duration: {
								start: new Date(data.durationStart),
								...(data.durationEnd != null ? { end: new Date(data.durationEnd) } : {}),
							},
						},
					]);
				}

				setSelectedPerson(null);
			}
		});
	}

	function openEditDialog(chair: WorkingGroupChair) {
		setEditState(createActionStateInitial());
		setItemToEdit(chair);
		setEditPerson({ id: chair.personId, name: chair.personName });
		setEditStartDate(dateToCalendarDate(chair.duration.start));
		setEditEndDate(dateToCalendarDate(chair.duration.end));
	}

	function editFormAction(formData: FormData) {
		const person = editPerson;

		startEditTransition(async () => {
			const newState = await updateWorkingGroupChairAction(editState, formData);
			setEditState(newState);

			if (newState.status === "success" && itemToEdit != null && person != null) {
				const start = editStartDate?.toDate(getLocalTimeZone()) ?? itemToEdit.duration.start;
				const end = editEndDate?.toDate(getLocalTimeZone()) ?? undefined;

				setLocalChairs((prev) =>
					prev.map((chair) =>
						chair.id === itemToEdit.id
							? {
									...chair,
									personId: person.id,
									personName: person.name,
									duration: { start, ...(end != null ? { end } : {}) },
								}
							: chair,
					),
				);
				setItemToEdit(null);
			}
		});
	}

	return (
		<Fragment>
			<div className="max-inline-3xl space-y-6">
				<div className="space-y-1">
					<FormSectionTitle title={t("Chairs")} />
				</div>

				{localChairs.length > 0 ? (
					<Table aria-label="chairs" className="[--gutter:0] sm:[--gutter:0]">
						<TableHeader>
							<TableColumn isRowHeader={true}>{t("Person")}</TableColumn>
							<TableColumn>{t("From")}</TableColumn>
							<TableColumn>{t("Until")}</TableColumn>
							<TableColumn />
						</TableHeader>
						<TableBody items={localChairs}>
							{(chair) => (
								<TableRow id={chair.id}>
									<TableCell>
										<div className="flex items-center gap-x-2">
											<span>{chair.personName}</span>
											{chair.lifecycleStatus != null && (
												<Badge intent={chair.lifecycleStatus === "new" ? "emerald" : "amber"}>
													{formatLifecycleStatus(chair.lifecycleStatus, t)}
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell>
										{format.dateTime(chair.duration.start, { dateStyle: "short" })}
									</TableCell>
									<TableCell>
										{chair.duration.end != null
											? format.dateTime(chair.duration.end, { dateStyle: "short" })
											: t("present")}
									</TableCell>
									<TableCell className="text-end">
										<div className="flex justify-end gap-1">
											<Tooltip>
												<Button
													aria-label={t("Edit chair")}
													className="block-7 sm:block-7"
													intent="plain"
													onPress={() => {
														openEditDialog(chair);
													}}
													size="sq-sm"
												>
													<PencilSquareIcon className="block-4 inline-4" />
												</Button>
												<TooltipContent inverse={true}>{t("Edit chair")}</TooltipContent>
											</Tooltip>
											{chair.duration.end == null && (
												<Tooltip>
													<Button
														aria-label={t("End chairship")}
														className="block-7 sm:block-7"
														intent="plain"
														onPress={() => {
															setItemToEnd({ id: chair.id });
															setSelectedEndDate(null);
														}}
														size="sq-sm"
													>
														<ArchiveBoxXMarkIcon className="block-4 inline-4" />
													</Button>
													<TooltipContent inverse={true}>{t("End chairship")}</TooltipContent>
												</Tooltip>
											)}
											<Tooltip>
												<Button
													aria-label={t("Delete chair")}
													className="block-7 sm:block-7"
													intent="plain"
													onPress={() => {
														setItemToDelete({ id: chair.id });
													}}
													size="sq-sm"
												>
													<TrashIcon className="block-4 inline-4" />
												</Button>
												<TooltipContent inverse={true}>{t("Delete chair")}</TooltipContent>
											</Tooltip>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				) : (
					<p className="text-sm text-neutral-500">{t("No chairs.")}</p>
				)}

				<FormLayout variant="stacked">
					<Form action={formAction} className="flex flex-col gap-y-6" state={state}>
						<FormSection
							description={t("Add a person as chair of this working group.")}
							title={t("Add chair")}
							variant="stacked"
						>
							<AsyncSelect
								aria-label={t("Person")}
								emptyMessage={t("No persons found.")}
								fetchPage={fetchPersonOptionsPage}
								initialItems={initialPersonItems}
								initialTotal={initialPersonTotal}
								label={t("Person")}
								onSelect={(item) => {
									setSelectedPerson(item);
								}}
								placeholder={t("No person selected")}
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

							<input name="unitId" type="hidden" value={unitId} />
						</FormSection>

						<Button className="self-start" isPending={isPending} type="submit">
							{isPending ? (
								<Fragment>
									<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
									<span aria-hidden={true}>{t("Saving...")}</span>
								</Fragment>
							) : (
								t("Add chair")
							)}
						</Button>

						<FormStatus className="self-start" state={state} />
					</Form>
				</FormLayout>
			</div>

			<ModalContent
				isOpen={itemToEnd != null}
				onOpenChange={(open) => {
					if (!open) {
						setItemToEnd(null);
					}
				}}
				role="alertdialog"
				size="sm"
			>
				<ModalHeader
					description={t("Set the date on which this chairship ended.")}
					title={t("End chairship")}
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
							if (itemToEnd == null || selectedEndDate == null) {
								return;
							}

							const end = selectedEndDate.toDate(getLocalTimeZone());

							startTransition(async () => {
								await endWorkingGroupChairAction(itemToEnd.id, end);
								setLocalChairs((prev) =>
									prev.map((c) =>
										c.id === itemToEnd.id ? { ...c, duration: { ...c.duration, end } } : c,
									),
								);
								setItemToEnd(null);
							});
						}}
					>
						{t("Confirm")}
					</Button>
				</ModalFooter>
			</ModalContent>

			<ModalContent
				isOpen={itemToEdit != null}
				onOpenChange={(open) => {
					if (!open) {
						setItemToEdit(null);
					}
				}}
			>
				<ModalHeader description={t("Update the chair and duration.")} title={t("Edit chair")} />
				<Form action={editFormAction} state={editState}>
					<ModalBody className="flex flex-col gap-y-4">
						<input name="id" type="hidden" value={itemToEdit?.id ?? ""} />
						<input name="unitId" type="hidden" value={unitId} />
						<AsyncSelect
							aria-label={t("Person")}
							emptyMessage={t("No persons found.")}
							errorMessage={
								typeof editValidationErrors?.personId === "string"
									? editValidationErrors.personId
									: undefined
							}
							fetchPage={fetchPersonOptionsPage}
							initialItems={initialPersonItems}
							initialTotal={initialPersonTotal}
							label={t("Person")}
							onSelect={(item) => {
								setEditPerson(item);
							}}
							placeholder={t("No person selected")}
							selectedItem={editPerson}
						/>
						<input name="personId" type="hidden" value={editPerson?.id ?? ""} />
						<DatePicker
							granularity="day"
							isRequired={true}
							name="duration.start"
							onChange={(date) => {
								setEditStartDate(date);
							}}
							value={editStartDate}
						>
							<Label>{t("Start date")}</Label>
							<DatePickerTrigger />
							<FieldError />
						</DatePicker>
						<DatePicker
							granularity="day"
							name="duration.end"
							onChange={(date) => {
								setEditEndDate(date);
							}}
							value={editEndDate}
						>
							<Label>{t("End date")}</Label>
							<DatePickerTrigger />
							<FieldError />
						</DatePicker>
						<FormStatus className="self-start" state={editState} />
					</ModalBody>
					<ModalFooter>
						<ModalClose>{t("Cancel")}</ModalClose>
						<Button isPending={isEditPending} type="submit">
							{isEditPending ? (
								<Fragment>
									<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
									<span aria-hidden={true}>{t("Saving...")}</span>
								</Fragment>
							) : (
								t("Save")
							)}
						</Button>
					</ModalFooter>
				</Form>
			</ModalContent>

			<ModalContent
				isOpen={itemToDelete != null}
				onOpenChange={(open) => {
					if (!open) {
						setItemToDelete(null);
					}
				}}
				role="alertdialog"
				size="sm"
			>
				<ModalHeader
					description={t("This will permanently delete this chair relation.")}
					title={t("Delete chair")}
				/>
				<ModalFooter>
					<ModalClose>{t("Cancel")}</ModalClose>
					<Button
						intent="danger"
						onPress={() => {
							if (itemToDelete == null) {
								return;
							}

							const id = itemToDelete.id;
							startTransition(async () => {
								await deleteWorkingGroupChairAction(id);
								setLocalChairs((prev) => prev.filter((chair) => chair.id !== id));
								setItemToDelete(null);
							});
						}}
					>
						{t("Delete")}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Fragment>
	);
}
