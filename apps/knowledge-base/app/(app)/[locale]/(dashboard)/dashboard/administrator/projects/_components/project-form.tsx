"use client";

import type * as schema from "@dariah-eric/database/schema";
import { socialMediaTypesEnum } from "@dariah-eric/database/schema";
import { type ActionState, createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { DatePicker, DatePickerTrigger } from "@dariah-eric/ui/date-picker";
import { FieldError, fieldErrorStyles, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import {
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@dariah-eric/ui/modal";
import {
	MultipleSelect,
	MultipleSelectContent,
	MultipleSelectItem,
} from "@dariah-eric/ui/multiple-select";
import { NumberField } from "@dariah-eric/ui/number-field";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { RichTextEditor } from "@dariah-eric/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import { PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { CalendarDate, parseDate } from "@internationalized/date";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState, useTransition } from "react";
import { Text } from "react-aria-components";

import { FormSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import {
	type CreatedSocialMedia,
	createSocialMediaAction,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/create-social-media.action";
import type { ServerAction } from "@/lib/server/create-server-action";

interface PartnerEntry {
	_tempId: string;
	existingId: string | null;
	unitId: string;
	unitName: string;
	roleId: string;
	roleName: string;
	durationStart: string | null;
	durationEnd: string | null;
}

interface DialogState {
	isOpen: boolean;
	editingIndex: number | null;
	unitId: string;
	roleId: string;
	durationStart: CalendarDate | null;
	durationEnd: CalendarDate | null;
}

const emptyDialog: DialogState = {
	isOpen: false,
	editingIndex: null,
	unitId: "",
	roleId: "",
	durationStart: null,
	durationEnd: null,
};

interface ProjectFormProps {
	assets: Array<{ key: string; label: string; url: string }>;
	project?: Pick<
		schema.Project,
		"acronym" | "call" | "duration" | "funders" | "funding" | "id" | "name" | "summary" | "topic"
	> & {
		description?: JSONContent;
		entity: Pick<schema.Entity, "documentId" | "slug"> & {
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
		scope: Pick<schema.ProjectScope, "id" | "scope">;
	} & { image: { key: string; label: string; url: string } | null };
	formAction: ServerAction;
	scopes: Array<Pick<schema.ProjectScope, "id" | "scope">>;
	orgUnits: Array<{ id: string; name: string }>;
	roles: Array<Pick<schema.ProjectRole, "id" | "role">>;
	socialMediaItems: Array<{
		id: string;
		name: string;
		type: Pick<schema.SocialMediaType, "type">;
		url: string;
	}>;
	initialPartners?: Array<{
		id: string;
		unitId: string;
		unitName: string;
		roleId: string;
		roleName: string;
		durationStart: string | null;
		durationEnd: string | null;
	}>;
	initialSocialMediaIds?: Array<string>;
}

export function ProjectForm(props: Readonly<ProjectFormProps>): ReactNode {
	const {
		assets,
		formAction,
		project,
		scopes,
		orgUnits,
		roles,
		socialMediaItems,
		initialPartners,
		initialSocialMediaIds,
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		project?.image ?? null,
	);
	const [imageKeyError, setImageKeyError] = useState(false);

	const [partners, setPartners] = useState<Array<PartnerEntry>>(() => {
		return (
			initialPartners?.map((p) => {
				return { ...p, _tempId: p.id, existingId: p.id };
			}) ?? []
		);
	});

	const [selectedSocialMediaIds, setSelectedSocialMediaIds] = useState<Array<string>>(
		initialSocialMediaIds ?? [],
	);

	const [localSocialMediaItems, setLocalSocialMediaItems] = useState<
		Array<{ id: string; name: string; url: string; type: { type: string } }>
	>(() => {
		return socialMediaItems;
	});

	const [isCreateSocialMediaOpen, setIsCreateSocialMediaOpen] = useState(false);
	const [createSocialMediaFormKey, setCreateSocialMediaFormKey] = useState(0);

	const [createSocialMediaState, setCreateSocialMediaState] = useState<
		ActionState<CreatedSocialMedia>
	>(() => {
		return createActionStateInitial();
	});
	const [isCreateSocialMediaPending, startCreateSocialMediaTransition] = useTransition();

	function handleCreateSocialMedia(formData: FormData) {
		startCreateSocialMediaTransition(async () => {
			const result = await createSocialMediaAction(createSocialMediaState, formData);
			setCreateSocialMediaState(result);
			if (result.status === "success") {
				setLocalSocialMediaItems((prev) => {
					return [...prev, result.data];
				});
				setSelectedSocialMediaIds((prev) => {
					return [...prev, result.data.id];
				});
				setIsCreateSocialMediaOpen(false);
				setCreateSocialMediaFormKey((prev) => {
					return prev + 1;
				});
			}
		});
	}

	const [dialog, setDialog] = useState<DialogState>(emptyDialog);

	function openAddDialog() {
		setDialog({ ...emptyDialog, isOpen: true });
	}

	function openEditDialog(index: number) {
		const p = partners[index];

		if (p == null) {
			return;
		}

		setDialog({
			isOpen: true,
			editingIndex: index,
			unitId: p.unitId,
			roleId: p.roleId,
			durationStart: p.durationStart != null ? parseDate(p.durationStart) : null,
			durationEnd: p.durationEnd != null ? parseDate(p.durationEnd) : null,
		});
	}

	function handleConfirmDialog() {
		if (!dialog.unitId || !dialog.roleId) {
			return;
		}

		const unit = orgUnits.find((u) => {
			return u.id === dialog.unitId;
		});
		const role = roles.find((r) => {
			return r.id === dialog.roleId;
		});

		const entry: PartnerEntry = {
			_tempId:
				dialog.editingIndex !== null
					? (partners[dialog.editingIndex]?._tempId ?? crypto.randomUUID())
					: crypto.randomUUID(),
			existingId:
				dialog.editingIndex !== null ? (partners[dialog.editingIndex]?.existingId ?? null) : null,
			unitId: dialog.unitId,
			unitName: unit?.name ?? "",
			roleId: dialog.roleId,
			roleName: role?.role ?? "",
			durationStart: dialog.durationStart?.toString() ?? null,
			durationEnd: dialog.durationEnd?.toString() ?? null,
		};

		if (dialog.editingIndex !== null) {
			setPartners((prev) => {
				return prev.map((p, i) => {
					return i === dialog.editingIndex ? entry : p;
				});
			});
		} else {
			setPartners((prev) => {
				return [...prev, entry];
			});
		}

		setDialog(emptyDialog);
	}

	function removePartner(index: number) {
		setPartners((prev) => {
			return prev.filter((_, i) => {
				return i !== index;
			});
		});
	}

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormSection description={t("Enter the project details.")} title={t("Details")}>
				<TextField defaultValue={project?.name} isRequired={true} name="name">
					<Label>{t("Name")}</Label>
					<Input placeholder={t("Name")} />
					<FieldError />
				</TextField>

				<TextField defaultValue={project?.acronym ?? undefined} name="acronym">
					<Label>{t("Acronym")}</Label>
					<Input placeholder={t("Acronym")} />
					<FieldError />
				</TextField>

				<TextField defaultValue={project?.funders ?? undefined} name="funders">
					<Label>{t("Funders")}</Label>
					<Input placeholder={t("Funders")} />
					<FieldError />
				</TextField>

				<NumberField
					defaultValue={project?.funding ?? undefined}
					formatOptions={{ currency: "EUR", style: "currency" }}
					name="funding"
				>
					<Label>{t("Funding")}</Label>
					<Input placeholder={t("Funding")} />
					<FieldError />
				</NumberField>

				<TextField defaultValue={project?.topic ?? undefined} name="topic">
					<Label>{t("Topic")}</Label>
					<Input placeholder={t("Topic")} />
					<FieldError />
				</TextField>

				<TextField defaultValue={project?.call ?? undefined} name="call">
					<Label>{t("Call")}</Label>
					<Input placeholder={t("Call")} />
					<FieldError />
				</TextField>

				<DatePicker
					defaultValue={
						project != null
							? new CalendarDate(
									project.duration.start.getUTCFullYear(),
									project.duration.start.getUTCMonth() + 1,
									project.duration.start.getUTCDate(),
								)
							: undefined
					}
					granularity="day"
					isRequired={true}
					name="duration.start"
				>
					<Label>{t("Start date")}</Label>
					<DatePickerTrigger />
					<FieldError />
				</DatePicker>

				<DatePicker
					defaultValue={
						project?.duration.end != null
							? new CalendarDate(
									project.duration.end.getUTCFullYear(),
									project.duration.end.getUTCMonth() + 1,
									project.duration.end.getUTCDate(),
								)
							: undefined
					}
					granularity="day"
					name="duration.end"
				>
					<Label>{t("End date")}</Label>
					<DatePickerTrigger />
					<FieldError />
				</DatePicker>

				<Select defaultValue={project?.scope.id ?? undefined} isRequired={true} name="scopeId">
					<Label>{t("Scope")}</Label>
					<SelectTrigger />
					<FieldError />
					<SelectContent>
						{scopes.map((item) => {
							return (
								<SelectItem key={item.id} id={item.id}>
									{item.scope}
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>

				<TextField defaultValue={project?.summary} isRequired={true} name="summary">
					<Label>{t("Summary")}</Label>
					<TextArea placeholder={t("Summary")} />
					<FieldError />
				</TextField>
			</FormSection>

			<Separator className="my-6" />

			<FormSection description={t("Select or upload an image.")} title={t("Image")}>
				{selectedImage != null && (
					<img
						alt={t("Selected image")}
						className="size-24 rounded-lg object-cover"
						src={selectedImage.url}
					/>
				)}
				<MediaLibraryDialog
					assets={assets}
					onSelect={(key, url) => {
						setSelectedImage({ key, url });
						setImageKeyError(false);
					}}
					prefix="logos"
				/>

				<input
					aria-hidden={true}
					className="sr-only"
					name="imageKey"
					onInvalid={(e) => {
						e.preventDefault();
						setImageKeyError(true);
					}}
					readOnly={true}
					// required={true}
					tabIndex={-1}
					value={selectedImage?.key ?? ""}
				/>
				{imageKeyError ? (
					<div className={fieldErrorStyles()}>{t("Please select an image.")}</div>
				) : null}
			</FormSection>

			<Separator className="my-6" />

			<FormSection description={t("Add a short description.")} title={t("Description")}>
				<RichTextEditor
					aria-label={t("Description")}
					content={project?.description}
					name="description"
				/>
			</FormSection>

			<Separator className="my-6" />

			<FormSection
				description={t("Link social media accounts to this project.")}
				title={t("Social media")}
			>
				{localSocialMediaItems.length > 0 ? (
					<MultipleSelect
						aria-label={t("Social media")}
						onChange={(keys) => {
							setSelectedSocialMediaIds(keys.map(String));
						}}
						placeholder={t("No social media linked")}
						value={selectedSocialMediaIds}
					>
						<MultipleSelectContent items={localSocialMediaItems}>
							{(item) => {
								return (
									<MultipleSelectItem id={item.id} textValue={item.name}>
										<div className="col-start-2">
											<Text slot="label">{item.name}</Text>
											<Text className="block text-xs text-muted-fg" slot="description">
												{item.type.type}
												{" · "}
												{item.url}
											</Text>
										</div>
									</MultipleSelectItem>
								);
							}}
						</MultipleSelectContent>
					</MultipleSelect>
				) : (
					<p>{t("No social media entries available.")}</p>
				)}
				<Button
					className="self-start"
					intent="outline"
					onPress={() => {
						setIsCreateSocialMediaOpen(true);
					}}
				>
					<PlusIcon />
					{t("Create social media")}
				</Button>
				{selectedSocialMediaIds.map((id, index) => {
					return (
						<input key={id} name={`socialMediaIds.${String(index)}`} type="hidden" value={id} />
					);
				})}
			</FormSection>

			<Separator className="my-6" />

			<FormSection
				description={t("Add partner organisations and their roles in this project.")}
				title={t("Partners")}
			>
				<div className="flex flex-col gap-3">
					{partners.map((partner, index) => {
						return (
							<div
								key={partner._tempId}
								className="flex items-center gap-3 rounded-lg border px-4 py-3"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">{partner.unitName}</p>
									<p className="text-xs text-muted-fg">
										{partner.roleName}
										{partner.durationStart != null ? ` · ${partner.durationStart}` : null}
										{partner.durationEnd != null ? ` – ${partner.durationEnd}` : null}
									</p>
								</div>
								<Button
									aria-label={t("Edit partner")}
									intent="plain"
									onPress={() => {
										openEditDialog(index);
									}}
									size="sq-xs"
								>
									<PencilSquareIcon />
								</Button>
								<Button
									aria-label={t("Remove partner")}
									intent="plain"
									onPress={() => {
										removePartner(index);
									}}
									size="sq-xs"
								>
									<TrashIcon />
								</Button>
							</div>
						);
					})}
					<Button className="self-start" intent="outline" onPress={openAddDialog}>
						<PlusIcon />
						{t("Add partner")}
					</Button>
				</div>
				{partners.map(
					({ _tempId, existingId, unitId, roleId, durationStart, durationEnd }, index) => {
						return (
							<Fragment key={_tempId}>
								{existingId != null && (
									<input name={`partners.${String(index)}.id`} type="hidden" value={existingId} />
								)}
								<input name={`partners.${String(index)}.unitId`} type="hidden" value={unitId} />
								<input name={`partners.${String(index)}.roleId`} type="hidden" value={roleId} />
								{durationStart != null && (
									<input
										name={`partners.${String(index)}.durationStart`}
										type="hidden"
										value={durationStart}
									/>
								)}
								{durationEnd != null && (
									<input
										name={`partners.${String(index)}.durationEnd`}
										type="hidden"
										value={durationEnd}
									/>
								)}
							</Fragment>
						);
					},
				)}
			</FormSection>

			<ModalContent
				isOpen={dialog.isOpen}
				onOpenChange={(open) => {
					setDialog((prev) => {
						return { ...prev, isOpen: open };
					});
				}}
			>
				<ModalHeader
					description={t("Select an organisation, its role, and an optional involvement period.")}
					title={dialog.editingIndex !== null ? t("Edit partner") : t("Add partner")}
				/>
				<ModalBody className="flex flex-col gap-y-4">
					<Select
						isRequired={true}
						onChange={(key) => {
							setDialog((prev) => {
								return { ...prev, unitId: String(key) };
							});
						}}
						value={dialog.unitId || null}
					>
						<Label>{t("Organisation")}</Label>
						<SelectTrigger />
						<SelectContent items={orgUnits}>
							{(unit) => {
								return <SelectItem id={unit.id}>{unit.name}</SelectItem>;
							}}
						</SelectContent>
					</Select>

					<Select
						isRequired={true}
						onChange={(key) => {
							setDialog((prev) => {
								return { ...prev, roleId: String(key) };
							});
						}}
						value={dialog.roleId || null}
					>
						<Label>{t("Role")}</Label>
						<SelectTrigger />
						<SelectContent items={roles}>
							{(role) => {
								return <SelectItem id={role.id}>{role.role}</SelectItem>;
							}}
						</SelectContent>
					</Select>

					<DatePicker
						granularity="day"
						onChange={(date) => {
							setDialog((prev) => {
								return { ...prev, durationStart: date };
							});
						}}
						value={dialog.durationStart}
					>
						<Label>{t("Start date (optional)")}</Label>
						<DatePickerTrigger />
					</DatePicker>

					<DatePicker
						granularity="day"
						onChange={(date) => {
							setDialog((prev) => {
								return { ...prev, durationEnd: date };
							});
						}}
						value={dialog.durationEnd}
					>
						<Label>{t("End date (optional)")}</Label>
						<DatePickerTrigger />
					</DatePicker>
				</ModalBody>
				<ModalFooter>
					<ModalClose>{t("Cancel")}</ModalClose>
					<Button isDisabled={!dialog.unitId || !dialog.roleId} onPress={handleConfirmDialog}>
						{dialog.editingIndex !== null ? t("Update") : t("Add")}
					</Button>
				</ModalFooter>
			</ModalContent>

			<ModalContent
				isOpen={isCreateSocialMediaOpen}
				onOpenChange={(open) => {
					setIsCreateSocialMediaOpen(open);
					if (!open) {
						setCreateSocialMediaFormKey((prev) => {
							return prev + 1;
						});
					}
				}}
			>
				<Form
					key={createSocialMediaFormKey}
					action={handleCreateSocialMedia}
					state={createSocialMediaState}
				>
					<ModalHeader
						description={t("Fill in the details for the new social media entry.")}
						title={t("Create social media")}
					/>
					<ModalBody className="flex flex-col gap-y-4">
						<TextField isRequired={true} name="name">
							<Label>{t("Name")}</Label>
							<Input placeholder={t("Name")} />
							<FieldError />
						</TextField>

						<TextField isRequired={true} name="url">
							<Label>{t("URL")}</Label>
							<Input placeholder="https://" />
							<FieldError />
						</TextField>

						<Select isRequired={true} name="type">
							<Label>{t("Type")}</Label>
							<SelectTrigger />
							<FieldError />
							<SelectContent>
								{socialMediaTypesEnum.map((type) => {
									return (
										<SelectItem key={type} id={type}>
											{type}
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>

						<DatePicker granularity="day" name="duration.start">
							<Label>{t("Start date (optional)")}</Label>
							<DatePickerTrigger />
						</DatePicker>

						<DatePicker granularity="day" name="duration.end">
							<Label>{t("End date (optional)")}</Label>
							<DatePickerTrigger />
						</DatePicker>
					</ModalBody>
					<ModalFooter>
						<ModalClose>{t("Cancel")}</ModalClose>
						<Button isPending={isCreateSocialMediaPending} type="submit">
							{isCreateSocialMediaPending ? (
								<Fragment>
									<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
									<span aria-hidden={true}>{t("Saving...")}</span>
								</Fragment>
							) : (
								t("Create")
							)}
						</Button>
					</ModalFooter>
					<FormStatus className="px-6 pb-4" state={createSocialMediaState} />
				</Form>
			</ModalContent>

			{project != null ? (
				<Fragment>
					<input name="id" type="hidden" value={project.id} />
					<input name="documentId" type="hidden" value={project.entity.documentId} />
				</Fragment>
			) : null}

			<Button className="self-end" isPending={isPending} type="submit">
				{isPending ? (
					<Fragment>
						<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
						<span aria-hidden={true}>{t("Saving...")}</span>
					</Fragment>
				) : (
					t("Save")
				)}
			</Button>

			<FormStatus className="self-end" state={state} />
		</Form>
	);
}
