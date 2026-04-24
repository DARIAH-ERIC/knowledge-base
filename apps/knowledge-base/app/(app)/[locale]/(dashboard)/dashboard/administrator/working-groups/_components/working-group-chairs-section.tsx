"use client";

import { type ActionState, createActionStateInitial } from "@dariah-eric/next-lib/actions";
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

import { AsyncOptionPicker } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/async-option-picker";
import {
	FormLayout,
	FormSection,
	FormSectionTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import type { AsyncOptionsFetchPageParams } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-async-options";
import { createWorkingGroupChairAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/create-working-group-chair.action";
import { endWorkingGroupChairAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/end-working-group-chair.action";
import type { AvailablePerson } from "@/lib/data/article-contributors";
import type { WorkingGroupChair } from "@/lib/data/working-group-chairs";

interface WorkingGroupChairsSectionProps {
	unitId: string;
	chairs: Array<WorkingGroupChair>;
	initialPersonItems: Array<AvailablePerson>;
	initialPersonTotal: number;
}

async function fetchPersonOptionsPage(
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<AvailablePerson>; total: number }> {
	const searchParams = new URLSearchParams({
		limit: String(params.limit),
		offset: String(params.offset),
	});

	if (params.q !== "") {
		searchParams.set("q", params.q);
	}

	const response = await fetch(`/api/persons/options?${searchParams.toString()}`, {
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

	const [localChairs, setLocalChairs] = useState(() => {
		return chairs;
	});
	const [itemToEnd, setItemToEnd] = useState<{ id: string } | null>(null);
	const [selectedEndDate, setSelectedEndDate] = useState<CalendarDate | null>(null);

	const [selectedPerson, setSelectedPerson] = useState<AvailablePerson | null>(null);

	const [state, setState] = useState<ActionState>(() => {
		return createActionStateInitial();
	});
	const [isPending, startFormTransition] = useTransition();

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
					setLocalChairs((prev) => {
						return [
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
						];
					});
				}

				setSelectedPerson(null);
			}
		});
	}

	return (
		<Fragment>
			<Separator className="my-8" />

			<div className="max-w-3xl space-y-6">
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
							{(chair) => {
								return (
									<TableRow id={chair.id}>
										<TableCell>{chair.personName}</TableCell>
										<TableCell>
											{format.dateTime(chair.duration.start, { dateStyle: "short" })}
										</TableCell>
										<TableCell>
											{chair.duration.end != null
												? format.dateTime(chair.duration.end, { dateStyle: "short" })
												: t("present")}
										</TableCell>
										<TableCell className="text-end">
											{chair.duration.end == null && (
												<Button
													aria-label={t("End chairship")}
													className="h-7 sm:h-7"
													intent="plain"
													onPress={() => {
														setItemToEnd({ id: chair.id });
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
					<p className="text-sm text-neutral-500">{t("No chairs.")}</p>
				)}

				<FormLayout variant="stacked">
					<Form action={formAction} className="flex flex-col gap-y-6" state={state}>
						<FormSection
							description={t("Add a person as chair of this working group.")}
							title={t("Add chair")}
							variant="stacked"
						>
							<AsyncOptionPicker
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
					if (!open) setItemToEnd(null);
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
							if (itemToEnd == null || selectedEndDate == null) return;

							const end = selectedEndDate.toDate(getLocalTimeZone());

							startTransition(async () => {
								await endWorkingGroupChairAction(itemToEnd.id, end);
								setLocalChairs((prev) => {
									return prev.map((c) => {
										return c.id === itemToEnd.id ? { ...c, duration: { ...c.duration, end } } : c;
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
