"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { DatePicker, DatePickerTrigger } from "@dariah-eric/ui/date-picker";
import { Description, FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { Input } from "@dariah-eric/ui/input";
import { NumberField } from "@dariah-eric/ui/number-field";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import type { AsyncOption } from "@dariah-eric/ui/use-async-options";
import { CalendarDate } from "@internationalized/date";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityFormActions } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form-actions";
import { EntityRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-relations-fields";
import { EntitySlugField } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-slug-field";
import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import {
	ImageSelectField,
	type SelectedImage,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/image-select-field";
import { RichTextContentBlocksField } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/rich-text-content-blocks-field";
import { SocialMediaRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/social-media-relations-fields";
import type { ServerAction } from "@/lib/server/create-server-action";

interface ProjectFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	project?: Pick<
		schema.Project,
		"acronym" | "call" | "duration" | "funding" | "id" | "name" | "summary" | "topic"
	> & {
		descriptionContentBlocks?: Array<ContentBlock>;
		entityVersion: {
			entity: Pick<schema.Entity, "id" | "slug">;
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
		scope: Pick<schema.ProjectScope, "id" | "scope">;
	} & { image: SelectedImage | null };
	/** Whether the edited entity is published, which freezes its slug. Unused when creating. */
	isPublished?: boolean;
	formAction: ServerAction;
	scopes: Array<Pick<schema.ProjectScope, "id" | "scope">>;
	initialSocialMediaItems: Array<AsyncOption>;
	initialSocialMediaTotal: number;
	selectedSocialMediaItems?: Array<AsyncOption>;
	initialSocialMediaIds?: Array<string>;
	initialRelatedEntityIds?: Array<string>;
	initialRelatedEntityItems: Array<AsyncOption>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds?: Array<string>;
	initialRelatedResourceItems: Array<AsyncOption>;
	initialRelatedResourceTotal: number;
	selectedRelatedEntities?: Array<AsyncOption>;
	selectedRelatedResources?: Array<AsyncOption>;
}

export function ProjectForm(props: Readonly<ProjectFormProps>): ReactNode {
	const {
		initialAssets,
		formAction,
		project,
		scopes,
		initialSocialMediaItems,
		initialSocialMediaTotal,
		selectedSocialMediaItems,
		initialSocialMediaIds,
		initialRelatedEntityIds,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceIds,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		selectedRelatedEntities,
		selectedRelatedResources,
		isPublished,
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(project?.image ?? null);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection description={t("Enter the project details.")} title={t("Details")}>
					<TextField defaultValue={project?.name} isRequired={true} name="name">
						<Label>{t("Name")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={project?.acronym ?? undefined} name="acronym">
						<Label>{t("Acronym")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<NumberField
						defaultValue={project?.funding ?? undefined}
						formatOptions={{ currency: "EUR", style: "currency" }}
						name="funding"
					>
						<Label>{t("Funding")}</Label>
						<Input />
						<Description>{t("Enter the funding amount in euros.")}</Description>
						<FieldError />
					</NumberField>

					<TextField defaultValue={project?.topic ?? undefined} name="topic">
						<Label>{t("Topic")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={project?.call ?? undefined} name="call">
						<Label>{t("Call")}</Label>
						<Input />
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
							{scopes.map((item) => (
								<SelectItem key={item.id} id={item.id}>
									{item.scope}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<TextField defaultValue={project?.summary ?? undefined} name="summary">
						<Label>{t("Summary")}</Label>
						<TextArea rows={5} />
						<FieldError />
					</TextField>

					<EntitySlugField isPublished={isPublished} slug={project?.entityVersion.entity.slug} />
				</FormSection>

				<Separator className="my-6" />

				<FormSection description={t("Select or upload an image.")} title={t("Image")}>
					<ImageSelectField
						allowRemove={true}
						defaultPrefix="logos"
						initialAssets={initialAssets}
						onChange={setSelectedImage}
						prefixes={["logos"]}
						selectedImage={selectedImage}
					/>
				</FormSection>

				<Separator className="my-6" />

				<FormSection
					description={t("Add a short description.")}
					title={t("Description")}
					variant="stacked"
				>
					<RichTextContentBlocksField
						aria-label={t("Description")}
						initialBlocks={project?.descriptionContentBlocks}
						initialAssets={initialAssets}
						name="description"
					/>
				</FormSection>

				<Separator className="my-6" />

				<SocialMediaRelationsFields
					description={t("Link social media accounts to this project.")}
					initialSocialMediaIds={initialSocialMediaIds}
					initialSocialMediaItems={initialSocialMediaItems}
					initialSocialMediaTotal={initialSocialMediaTotal}
					selectedSocialMediaItems={selectedSocialMediaItems}
				/>

				<Separator className="my-6" />

				<EntityRelationsFields
					initialRelatedEntityIds={initialRelatedEntityIds}
					initialRelatedEntityItems={initialRelatedEntityItems}
					initialRelatedEntityTotal={initialRelatedEntityTotal}
					initialRelatedResourceIds={initialRelatedResourceIds}
					initialRelatedResourceItems={initialRelatedResourceItems}
					initialRelatedResourceTotal={initialRelatedResourceTotal}
					selectedRelatedEntities={selectedRelatedEntities}
					selectedRelatedResources={selectedRelatedResources}
				/>

				{project != null ? (
					<Fragment>
						<input name="id" type="hidden" value={project.id} />
						<input name="documentId" type="hidden" value={project.entityVersion.entity.id} />
					</Fragment>
				) : null}

				<EntityFormActions entityName={t("Project")} isPending={isPending} state={state} />
			</Form>
		</FormLayout>
	);
}
