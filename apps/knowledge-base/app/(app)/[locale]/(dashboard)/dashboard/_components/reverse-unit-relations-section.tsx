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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { Tooltip, TooltipContent } from "@dariah-eric/ui/tooltip";
import type { AsyncOption, AsyncOptionsFetchPageParams } from "@dariah-eric/ui/use-async-options";
import { ArchiveBoxXMarkIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { CalendarDate } from "@internationalized/date";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, startTransition, useState, useTransition } from "react";

import {
	FormLayout,
	FormSection,
	FormSectionTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { createUnitRelationAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-unit-relation.action";
import { deleteUnitRelationAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/delete-unit-relation.action";
import { endUnitRelationAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/end-unit-relation.action";
import { updateUnitRelationAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/update-unit-relation.action";
import type { OrganisationalUnitType } from "@/lib/data/organisational-units";
import type { ReverseUnitRelation, UnitRelationStatusOption } from "@/lib/data/unit-relations";
import { dateToCalendarDate } from "@/lib/date";

interface ReverseUnitRelationsSectionProps {
	/** The current unit's document id — the fixed _target_ of every relation shown here. */
	relatedUnitId: string;
	relations: Array<ReverseUnitRelation>;
	statusOptions: Array<UnitRelationStatusOption>;
	/** Organisational-unit type to pick as the relation's source/owner (e.g. "institution"). */
	sourceUnitType: OrganisationalUnitType;
	/** Entity-specific copy, kept in the parent so message extraction works. */
	messages: {
		title: string;
		/** Singular noun for the source unit, used as column header and picker label. */
		memberLabel: string;
		empty: string;
		addButton: string;
	};
}

async function fetchSourceUnitOptionsPage(
	unitType: string,
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<AsyncOption>; total: number }> {
	const searchParams = new URLSearchParams({
		limit: String(params.limit),
		offset: String(params.offset),
		unitType,
	});

	if (params.q !== "") {
		searchParams.set("q", params.q);
	}

	const response = await fetch(`/api/organisational-units/options?${searchParams.toString()}`, {
		signal: params.signal,
	});

	if (!response.ok) {
		throw new Error("Failed to load units.");
	}

	return (await response.json()) as { items: Array<AsyncOption>; total: number };
}

function formatStatus(type: string): string {
	return type.replaceAll("_", " ");
}

export function ReverseUnitRelationsSection(
	props: Readonly<ReverseUnitRelationsSectionProps>,
): ReactNode {
	const { relatedUnitId, relations, statusOptions, sourceUnitType, messages } = props;

	const t = useExtracted();
	const format = useFormatter();

	const hasStatusChoice = statusOptions.length > 1;
	const singleStatus = statusOptions.length === 1 ? statusOptions[0]! : null;

	const [localRelations, setLocalRelations] = useState(relations);
	const [itemToEnd, setItemToEnd] = useState<{ id: string } | null>(null);
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
	const [selectedEndDate, setSelectedEndDate] = useState<CalendarDate | null>(null);

	const [itemToEdit, setItemToEdit] = useState<ReverseUnitRelation | null>(null);
	const [editStatusId, setEditStatusId] = useState<string | null>(null);
	const [editUnitItem, setEditUnitItem] = useState<AsyncOption | null>(null);
	const [editStartDate, setEditStartDate] = useState<CalendarDate | null>(null);
	const [editEndDate, setEditEndDate] = useState<CalendarDate | null>(null);

	const [selectedStatusId, setSelectedStatusId] = useState<string | null>(
		singleStatus?.statusId ?? null,
	);
	const [selectedUnitItem, setSelectedUnitItem] = useState<AsyncOption | null>(null);

	const [state, setState] = useState<ActionState>(() => createActionStateInitial());
	const [editState, setEditState] = useState<ActionState>(() => createActionStateInitial());
	const [isPending, startFormTransition] = useTransition();
	const [isEditPending, startEditTransition] = useTransition();

	function resolveStatus(statusId: string | null): UnitRelationStatusOption | null {
		return statusOptions.find((entry) => entry.statusId === statusId) ?? null;
	}

	function formAction(formData: FormData) {
		const sourceUnit = selectedUnitItem;
		const option = resolveStatus(selectedStatusId);

		startFormTransition(async () => {
			const newState = await createUnitRelationAction(state, formData);
			setState(newState);

			if (newState.status === "success" && option != null && sourceUnit != null) {
				const data = newState.data as
					| { id: string; durationStart: string; durationEnd: string | null }
					| undefined;

				if (data != null) {
					setLocalRelations((prev) => [
						...prev,
						{
							id: data.id,
							statusId: option.statusId,
							statusType: option.statusType,
							unitId: sourceUnit.id,
							unitName: sourceUnit.name,
							unitSlug: "",
							unitType: sourceUnitType,
							duration: {
								start: new Date(data.durationStart),
								...(data.durationEnd != null ? { end: new Date(data.durationEnd) } : {}),
							},
						},
					]);
				}

				setSelectedUnitItem(null);
				setSelectedStatusId(singleStatus?.statusId ?? null);
			}
		});
	}

	function openEditDialog(relation: ReverseUnitRelation) {
		setEditState(createActionStateInitial());
		setItemToEdit(relation);
		setEditStatusId(relation.statusId);
		setEditUnitItem({ id: relation.unitId, name: relation.unitName });
		setEditStartDate(dateToCalendarDate(relation.duration.start));
		setEditEndDate(dateToCalendarDate(relation.duration.end));
	}

	function editFormAction(formData: FormData) {
		const sourceUnit = editUnitItem;
		const option = resolveStatus(editStatusId);

		startEditTransition(async () => {
			const newState = await updateUnitRelationAction(editState, formData);
			setEditState(newState);

			if (
				newState.status === "success" &&
				itemToEdit != null &&
				option != null &&
				sourceUnit != null
			) {
				const start = editStartDate?.toDate("UTC") ?? itemToEdit.duration.start;
				const end = editEndDate?.toDate("UTC") ?? undefined;

				setLocalRelations((prev) =>
					prev.map((relation) =>
						relation.id === itemToEdit.id
							? {
									...relation,
									statusId: option.statusId,
									statusType: option.statusType,
									unitId: sourceUnit.id,
									unitName: sourceUnit.name,
									duration: { start, ...(end != null ? { end } : {}) },
								}
							: relation,
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
					<FormSectionTitle title={messages.title} />
				</div>

				{localRelations.length > 0 ? (
					<Table aria-label={messages.title} className="[--gutter:0] sm:[--gutter:0]">
						<TableHeader>
							<TableColumn className="max-inline-80" isRowHeader={true}>
								{messages.memberLabel}
							</TableColumn>
							{hasStatusChoice ? <TableColumn>{t("Type")}</TableColumn> : null}
							<TableColumn>{t("From")}</TableColumn>
							<TableColumn>{t("Until")}</TableColumn>
							<TableColumn className="sticky end-0 z-10 bg-secondary/50 shadow-[-8px_0_12px_-12px_rgb(0_0_0/0.45)]" />
						</TableHeader>
						<TableBody items={localRelations}>
							{(relation) => (
								<TableRow id={relation.id}>
									<TableCell>
										<div className="max-inline-80 truncate" title={relation.unitName}>
											{relation.unitName}
										</div>
									</TableCell>
									{hasStatusChoice ? (
										<TableCell>
											<Badge intent="slate">{formatStatus(relation.statusType)}</Badge>
										</TableCell>
									) : null}
									<TableCell>
										{format.dateTime(relation.duration.start, { dateStyle: "short" })}
									</TableCell>
									<TableCell>
										{relation.duration.end != null
											? format.dateTime(relation.duration.end, { dateStyle: "short" })
											: t("present")}
									</TableCell>
									<TableCell className="sticky end-0 z-10 bg-bg text-end shadow-[-8px_0_12px_-12px_rgb(0_0_0/0.45)]">
										<div className="flex justify-end gap-1">
											<Tooltip>
												<Button
													aria-label={t("Edit relation")}
													className="block-7 sm:block-7"
													intent="plain"
													onPress={() => {
														openEditDialog(relation);
													}}
													size="sq-sm"
												>
													<PencilSquareIcon className="block-4 inline-4" />
												</Button>
												<TooltipContent inverse={true}>{t("Edit relation")}</TooltipContent>
											</Tooltip>
											{relation.duration.end == null && (
												<Tooltip>
													<Button
														aria-label={t("End relation")}
														className="block-7 sm:block-7"
														intent="plain"
														onPress={() => {
															setItemToEnd({ id: relation.id });
															setSelectedEndDate(null);
														}}
														size="sq-sm"
													>
														<ArchiveBoxXMarkIcon className="block-4 inline-4" />
													</Button>
													<TooltipContent inverse={true}>{t("End relation")}</TooltipContent>
												</Tooltip>
											)}
											<Tooltip>
												<Button
													aria-label={t("Delete relation")}
													className="block-7 sm:block-7"
													intent="plain"
													onPress={() => {
														setItemToDelete({ id: relation.id });
													}}
													size="sq-sm"
												>
													<TrashIcon className="block-4 inline-4" />
												</Button>
												<TooltipContent inverse={true}>{t("Delete relation")}</TooltipContent>
											</Tooltip>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				) : (
					<p className="text-sm text-neutral-500">{messages.empty}</p>
				)}

				{statusOptions.length > 0 && (
					<FormLayout variant="stacked">
						<Form action={formAction} className="flex flex-col gap-y-6" state={state}>
							<FormSection
								description={t("Add a new relation to another organisational unit.")}
								title={messages.addButton}
								variant="stacked"
							>
								{hasStatusChoice ? (
									<Select
										isRequired={true}
										onChange={(key) => {
											setSelectedStatusId(String(key));
										}}
										value={selectedStatusId}
									>
										<Label>{t("Relation type")}</Label>
										<SelectTrigger />
										<FieldError />
										<SelectContent>
											{statusOptions.map((option) => (
												<SelectItem key={option.statusId} id={option.statusId}>
													{formatStatus(option.statusType)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : null}
								<input name="statusId" type="hidden" value={selectedStatusId ?? ""} />

								<AsyncSelect
									aria-label={messages.memberLabel}
									emptyMessage={t("No related units found.")}
									fetchPage={(params) => fetchSourceUnitOptionsPage(sourceUnitType, params)}
									initialItems={[]}
									initialTotal={0}
									label={messages.memberLabel}
									loadOnMount={true}
									onSelect={(item) => {
										setSelectedUnitItem(item);
									}}
									placeholder={t("No related unit selected")}
									selectedItem={selectedUnitItem}
								/>
								<input name="unitId" type="hidden" value={selectedUnitItem?.id ?? ""} />

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

								<input name="relatedUnitId" type="hidden" value={relatedUnitId} />
							</FormSection>

							<Button className="self-start" isPending={isPending} type="submit">
								{isPending ? (
									<Fragment>
										<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
										<span aria-hidden={true}>{t("Saving...")}</span>
									</Fragment>
								) : (
									messages.addButton
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
					if (!open) {
						setItemToEnd(null);
					}
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
							if (itemToEnd == null || selectedEndDate == null) {
								return;
							}

							const end = selectedEndDate.toDate("UTC");

							startTransition(async () => {
								await endUnitRelationAction(itemToEnd.id, end);
								setLocalRelations((prev) =>
									prev.map((relation) =>
										relation.id === itemToEnd.id
											? { ...relation, duration: { ...relation.duration, end } }
											: relation,
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
				<ModalHeader
					description={t("Update the related unit, relation type, and duration.")}
					title={t("Edit relation")}
				/>
				<Form action={editFormAction} state={editState}>
					<ModalBody className="flex flex-col gap-y-4">
						<input name="id" type="hidden" value={itemToEdit?.id ?? ""} />
						<input name="relatedUnitId" type="hidden" value={relatedUnitId} />
						{hasStatusChoice ? (
							<Select
								isRequired={true}
								onChange={(key) => {
									setEditStatusId(String(key));
								}}
								value={editStatusId}
							>
								<Label>{t("Relation type")}</Label>
								<SelectTrigger />
								<FieldError />
								<SelectContent>
									{statusOptions.map((option) => (
										<SelectItem key={option.statusId} id={option.statusId}>
											{formatStatus(option.statusType)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null}
						<input name="statusId" type="hidden" value={editStatusId ?? ""} />
						<AsyncSelect
							aria-label={messages.memberLabel}
							emptyMessage={t("No related units found.")}
							fetchPage={(params) => fetchSourceUnitOptionsPage(sourceUnitType, params)}
							initialItems={[]}
							initialTotal={0}
							label={messages.memberLabel}
							loadOnMount={true}
							onSelect={(item) => {
								setEditUnitItem(item);
							}}
							placeholder={t("No related unit selected")}
							selectedItem={editUnitItem}
						/>
						<input name="unitId" type="hidden" value={editUnitItem?.id ?? ""} />
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
					description={t("This will permanently delete this relation.")}
					title={t("Delete relation")}
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
								await deleteUnitRelationAction(id);
								setLocalRelations((prev) => prev.filter((relation) => relation.id !== id));
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
