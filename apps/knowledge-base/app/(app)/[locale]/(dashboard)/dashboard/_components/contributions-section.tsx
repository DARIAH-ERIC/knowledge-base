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
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, startTransition, useState, useTransition } from "react";

import {
	FormLayout,
	FormSection,
	FormSectionTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { createContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-contribution.action";
import { endContributionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/end-contribution.action";
import type { ContributionOption, PersonContribution } from "@/lib/data/contributions";

interface ContributionsSectionProps {
	personId: string;
	contributions: Array<PersonContribution>;
	allowedOptions: Array<ContributionOption>;
}

function formatRoleType(type: string): string {
	return type.replaceAll("_", " ");
}

export function ContributionsSection(props: Readonly<ContributionsSectionProps>): ReactNode {
	const { personId, allowedOptions, contributions } = props;

	const t = useExtracted();
	const format = useFormatter();

	const [localContributions, setLocalContributions] = useState(contributions);
	const [itemToEnd, setItemToEnd] = useState<{ id: string } | null>(null);
	const [selectedEndDate, setSelectedEndDate] = useState<CalendarDate | null>(null);

	const [selectedRoleTypeId, setSelectedRoleTypeId] = useState<string | null>(null);
	const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

	const [state, setState] = useState<ActionState>(createActionStateInitial());
	const [isPending, startFormTransition] = useTransition();

	const availableUnits =
		allowedOptions.find((o) => {
			return o.roleTypeId === selectedRoleTypeId;
		})?.availableUnits ?? [];

	function formAction(formData: FormData) {
		const roleTypeId = selectedRoleTypeId;
		const unitId = selectedUnitId;
		const option = allowedOptions.find((o) => {
			return o.roleTypeId === roleTypeId;
		});
		const unit = option?.availableUnits.find((u) => {
			return u.id === unitId;
		});

		startFormTransition(async () => {
			const newState = await createContributionAction(state, formData);
			setState(newState);

			if (newState.status === "success" && option != null && unit != null) {
				const data = newState.data as
					| { id: string; durationStart: string; durationEnd: string | null }
					| undefined;

				if (data != null) {
					setLocalContributions((prev) => {
						return [
							...prev,
							{
								id: data.id,
								roleTypeId: roleTypeId!,
								roleType: option.roleType as PersonContribution["roleType"],
								organisationalUnitId: unitId!,
								organisationalUnitName: unit.name,
								duration: {
									start: new Date(data.durationStart),
									...(data.durationEnd != null ? { end: new Date(data.durationEnd) } : {}),
								},
							},
						];
					});
				}

				setSelectedRoleTypeId(null);
				setSelectedUnitId(null);
			}
		});
	}

	return (
		<Fragment>
			<Separator className="my-8" />

			<div className="max-w-3xl space-y-6">
				<div className="space-y-1">
					<FormSectionTitle title={t("Contributions")} />
				</div>

				{localContributions.length > 0 ? (
					<Table aria-label="contributions" className="[--gutter:0] sm:[--gutter:0]">
						<TableHeader>
							<TableColumn isRowHeader={true}>{t("Role")}</TableColumn>
							<TableColumn>{t("Organisation")}</TableColumn>
							<TableColumn>{t("From")}</TableColumn>
							<TableColumn>{t("Until")}</TableColumn>
							<TableColumn />
						</TableHeader>
						<TableBody items={localContributions}>
							{(contribution) => {
								return (
									<TableRow id={contribution.id}>
										<TableCell>{formatRoleType(contribution.roleType)}</TableCell>
										<TableCell>{contribution.organisationalUnitName}</TableCell>
										<TableCell>
											{format.dateTime(contribution.duration.start, { dateStyle: "short" })}
										</TableCell>
										<TableCell>
											{contribution.duration.end != null
												? format.dateTime(contribution.duration.end, { dateStyle: "short" })
												: t("present")}
										</TableCell>
										<TableCell className="text-end">
											{contribution.duration.end == null && (
												<Button
													aria-label={t("End contribution")}
													className="h-7 sm:h-7"
													intent="plain"
													onPress={() => {
														setItemToEnd({ id: contribution.id });
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
					<p className="text-sm text-neutral-500">{t("No contributions.")}</p>
				)}

				{allowedOptions.length > 0 && (
					<FormLayout variant="stacked">
						<Form action={formAction} className="flex flex-col gap-y-6" state={state}>
							<FormSection
								description={t("Add a new contribution to an organisational unit.")}
								title={t("Add contribution")}
								variant="stacked"
							>
								<Select
									isRequired={true}
									onChange={(key) => {
										setSelectedRoleTypeId(String(key));
										setSelectedUnitId(null);
									}}
									value={selectedRoleTypeId}
								>
									<Label>{t("Role")}</Label>
									<SelectTrigger />
									<FieldError />
									<SelectContent>
										{allowedOptions.map((option) => {
											return (
												<SelectItem key={option.roleTypeId} id={option.roleTypeId}>
													{formatRoleType(option.roleType)}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
								<input name="roleTypeId" type="hidden" value={selectedRoleTypeId ?? ""} />

								<Select
									isDisabled={selectedRoleTypeId == null}
									isRequired={true}
									onChange={(key) => {
										setSelectedUnitId(String(key));
									}}
									value={selectedUnitId}
								>
									<Label>{t("Organisation")}</Label>
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
								<input name="organisationalUnitId" type="hidden" value={selectedUnitId ?? ""} />

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

								<input name="personId" type="hidden" value={personId} />
							</FormSection>

							<Button className="self-start" isPending={isPending} type="submit">
								{isPending ? (
									<Fragment>
										<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
										<span aria-hidden={true}>{t("Saving...")}</span>
									</Fragment>
								) : (
									t("Add contribution")
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
					description={t("Set the date on which this contribution ended.")}
					title={t("End contribution")}
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
								setLocalContributions((prev) => {
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
