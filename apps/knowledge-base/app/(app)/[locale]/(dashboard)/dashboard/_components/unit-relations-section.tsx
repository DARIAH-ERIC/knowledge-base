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
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, startTransition, useState, useTransition } from "react";

import {
	FormLayout,
	FormSection,
	FormSectionTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { createUnitRelationAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-unit-relation.action";
import { endUnitRelationAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/end-unit-relation.action";
import type { UnitRelation, UnitRelationOption } from "@/lib/data/unit-relations";

interface UnitRelationsSectionProps {
	unitId: string;
	relations: Array<UnitRelation>;
	allowedOptions: Array<UnitRelationOption>;
}

function formatDate(date: Date): string {
	return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function formatStatus(type: string): string {
	return type.replaceAll("_", " ");
}

export function UnitRelationsSection(props: Readonly<UnitRelationsSectionProps>): ReactNode {
	const { unitId, allowedOptions, relations } = props;

	const t = useExtracted();

	const [localRelations, setLocalRelations] = useState(relations);
	const [itemToEnd, setItemToEnd] = useState<{ id: string } | null>(null);
	const [selectedEndDate, setSelectedEndDate] = useState<CalendarDate | null>(null);

	const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
	const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

	const [state, setState] = useState<ActionState>(createActionStateInitial());
	const [isPending, startFormTransition] = useTransition();

	const availableUnits =
		allowedOptions.find((o) => {
			return o.statusId === selectedStatusId;
		})?.availableUnits ?? [];

	function formAction(formData: FormData) {
		const statusId = selectedStatusId;
		const relatedUnitId = selectedUnitId;
		const option = allowedOptions.find((o) => {
			return o.statusId === statusId;
		});
		const unit = option?.availableUnits.find((u) => {
			return u.id === relatedUnitId;
		});

		startFormTransition(async () => {
			const newState = await createUnitRelationAction(state, formData);
			setState(newState);

			if (newState.status === "success" && option != null && unit != null) {
				const data = newState.data as
					| { id: string; durationStart: string; durationEnd: string | null }
					| undefined;

				if (data != null) {
					setLocalRelations((prev) => {
						return [
							...prev,
							{
								id: data.id,
								statusId: statusId!,
								statusType: option.statusType as UnitRelation["statusType"],
								relatedUnitId: relatedUnitId!,
								relatedUnitName: unit.name,
								duration: {
									start: new Date(data.durationStart),
									...(data.durationEnd != null ? { end: new Date(data.durationEnd) } : {}),
								},
							},
						];
					});
				}

				setSelectedStatusId(null);
				setSelectedUnitId(null);
			}
		});
	}

	return (
		<Fragment>
			<Separator className="my-8" />

			<div className="max-w-3xl space-y-6">
				<div className="space-y-1">
					<FormSectionTitle title={t("Relations")} />
				</div>

				{localRelations.length > 0 ? (
					<Table aria-label="relations" className="[--gutter:0] sm:[--gutter:0]">
						<TableHeader>
							<TableColumn isRowHeader={true}>{t("Status")}</TableColumn>
							<TableColumn>{t("Related unit")}</TableColumn>
							<TableColumn>{t("From")}</TableColumn>
							<TableColumn>{t("Until")}</TableColumn>
							<TableColumn />
						</TableHeader>
						<TableBody items={localRelations}>
							{(relation) => {
								return (
									<TableRow id={relation.id}>
										<TableCell>{formatStatus(relation.statusType)}</TableCell>
										<TableCell>{relation.relatedUnitName}</TableCell>
										<TableCell>{formatDate(relation.duration.start)}</TableCell>
										<TableCell>
											{relation.duration.end != null
												? formatDate(relation.duration.end)
												: t("present")}
										</TableCell>
										<TableCell className="text-end">
											{relation.duration.end == null && (
												<Button
													aria-label={t("End relation")}
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
					<p className="text-sm text-neutral-500">{t("No relations.")}</p>
				)}

				{allowedOptions.length > 0 && (
					<FormLayout variant="stacked">
						<Form action={formAction} className="flex flex-col gap-y-6" state={state}>
							<FormSection
								description={t("Add a new relation to another organisational unit.")}
								title={t("Add relation")}
								variant="stacked"
							>
								<Select
									isRequired={true}
									onChange={(key) => {
										setSelectedStatusId(String(key));
										setSelectedUnitId(null);
									}}
									value={selectedStatusId}
								>
									<Label>{t("Relation type")}</Label>
									<SelectTrigger />
									<FieldError />
									<SelectContent>
										{allowedOptions.map((option) => {
											return (
												<SelectItem key={option.statusId} id={option.statusId}>
													{formatStatus(option.statusType)}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
								<input name="statusId" type="hidden" value={selectedStatusId ?? ""} />

								<Select
									isDisabled={selectedStatusId == null}
									isRequired={true}
									onChange={(key) => {
										setSelectedUnitId(String(key));
									}}
									value={selectedUnitId}
								>
									<Label>{t("Related unit")}</Label>
									<SelectTrigger />
									<FieldError />
									<SelectContent>
										{availableUnits.map((unit) => {
											return (
												<SelectItem key={unit.id} id={unit.id}>
													{unit.name}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
								<input name="relatedUnitId" type="hidden" value={selectedUnitId ?? ""} />

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
									t("Add relation")
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
					description={t("Set the date on which this relation ended.")}
					title={t("End relation")}
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
								await endUnitRelationAction(itemToEnd.id, end);
								setLocalRelations((prev) => {
									return prev.map((r) => {
										return r.id === itemToEnd.id ? { ...r, duration: { ...r.duration, end } } : r;
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
