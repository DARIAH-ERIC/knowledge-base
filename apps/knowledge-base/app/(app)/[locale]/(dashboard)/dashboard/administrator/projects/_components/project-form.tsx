"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { DatePicker, DatePickerTrigger } from "@dariah-eric/ui/date-picker";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { Input } from "@dariah-eric/ui/input";
import { NumberField } from "@dariah-eric/ui/number-field";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { RichTextEditor } from "@dariah-eric/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import { FormSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import type { ServerAction } from "@/lib/server/create-server-action";

interface ProjectFormProps {
	assets: Array<{ key: string; url: string }>;
	project?: Pick<
		schema.Project,
		"acronym" | "call" | "duration" | "funders" | "funding" | "id" | "name" | "summary" | "topic"
	> & {
		description?: JSONContent;
		entity: Pick<schema.Entity, "documentId" | "slug"> & {
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
		scope: Pick<schema.ProjectScope, "id" | "scope">;
	} & { image: { key: string; url: string } | null };
	formAction: ServerAction;
	scopes: Array<Pick<schema.ProjectScope, "id" | "scope">>;
}

export function ProjectForm(props: Readonly<ProjectFormProps>): ReactNode {
	const { assets, formAction, project, scopes } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		project?.image ?? null,
	);

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormSection
				description={t("Enter the projectal and contact details related to the project.")}
				title={t("Details")}
			>
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

				<TextField defaultValue={project?.funding ?? undefined} name="funding">
					<Label>{t("Funding")}</Label>
					<Input placeholder={t("Funding")} />
					<FieldError />
				</TextField>

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
					// defaultValue={project?.duration.start} // FIXME:
					granularity="day"
					isRequired={true}
					name="duration.start"
				>
					<Label>{t("Start date")}</Label>
					<DatePickerTrigger />
				</DatePicker>

				<DatePicker
					// defaultValue={project?.duration.end} // FIXME:
					granularity="day"
					name="duration.end"
				>
					<Label>{t("End date")}</Label>
					<DatePickerTrigger />
				</DatePicker>

				<Select defaultValue={project?.scope.id ?? undefined} isRequired={true} name="scopeId">
					<Label>{t("Scope")}</Label>
					<SelectTrigger />
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
					}}
				/>
			</FormSection>

			<Separator className="my-6" />

			<FormSection description={t("Add a short description.")} title={t("Description")}>
				<RichTextEditor content={project?.description} name="description" />
			</FormSection>

			{selectedImage != null ? (
				<input name="imageKey" type="hidden" value={selectedImage.key} />
			) : null}

			{project != null ? (
				<Fragment>
					<input name="id" type="hidden" value={project.id} />
					<input name="documentId" type="hidden" value={project.entity.documentId} />
				</Fragment>
			) : null}

			<Button
				className="self-end"
				isDisabled={selectedImage == null}
				isPending={isPending}
				type="submit"
			>
				{isPending ? (
					<Fragment>
						<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
						<span aria-hidden={true}>{t("Saving...")}</span>
					</Fragment>
				) : (
					t("Save")
				)}
			</Button>
		</Form>
	);
}
