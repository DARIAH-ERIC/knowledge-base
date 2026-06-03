"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Checkbox } from "@dariah-eric/ui/checkbox";
import { DatePicker, DatePickerTrigger } from "@dariah-eric/ui/date-picker";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { Input } from "@dariah-eric/ui/input";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import { CalendarDate } from "@internationalized/date";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import {
	type ContentBlock,
	ContentBlocks,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityFormActions } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form-actions";
import { EntityRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-relations-fields";
import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { ImageSelectField } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/image-select-field";
import type { ServerAction } from "@/lib/server/create-server-action";

interface EventFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks?: Array<ContentBlock>;
	event?: Pick<
		schema.Event,
		"id" | "duration" | "isFullDay" | "location" | "title" | "summary" | "website"
	> & {
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } };
	formId?: string;
	formAction: ServerAction;
	initialRelatedEntityIds?: Array<string>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds?: Array<string>;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
	selectedRelatedEntities?: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources?: Array<{ id: string; name: string; description?: string }>;
	showRelationFields?: boolean;
}

export function EventForm(props: Readonly<EventFormProps>): ReactNode {
	const {
		initialAssets,
		contentBlocks,
		formAction,
		formId,
		event,
		initialRelatedEntityIds,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceIds,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		selectedRelatedEntities,
		selectedRelatedResources,
		showRelationFields = true,
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		event?.image ?? null,
	);
	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" id={formId} state={state}>
				<FormSection description={t("Enter the event details.")} title={t("Details")}>
					<TextField defaultValue={event?.title} isRequired={true} name="title">
						<Label>{t("Title")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={event?.summary ?? undefined} isRequired={true} name="summary">
						<Label>{t("Summary")}</Label>
						<TextArea />
						<FieldError />
					</TextField>
					<DatePicker
						defaultValue={
							event != null
								? new CalendarDate(
										event.duration.start.getUTCFullYear(),
										event.duration.start.getUTCMonth() + 1,
										event.duration.start.getUTCDate(),
									)
								: undefined
						}
						granularity="day"
						isRequired={true}
						name="duration.start"
					>
						<Label>{t("Start date")}</Label>
						<DatePickerTrigger />
					</DatePicker>

					<DatePicker
						defaultValue={
							event?.duration.end != null
								? new CalendarDate(
										event.duration.end.getUTCFullYear(),
										event.duration.end.getUTCMonth() + 1,
										event.duration.end.getUTCDate(),
									)
								: undefined
						}
						granularity="day"
						name="duration.end"
					>
						<Label>{t("End date")}</Label>
						<DatePickerTrigger />
					</DatePicker>
					<Checkbox defaultSelected={event?.isFullDay ?? false} name="isFullDay" value="true">
						{t("Full day")}
					</Checkbox>
					<TextField defaultValue={event?.location ?? undefined} isRequired={true} name="location">
						<Label>{t("Location")}</Label>
						<Input />
						<FieldError />
					</TextField>
					<TextField defaultValue={event?.website ?? undefined} name="website" type="url">
						<Label>{t("Website")}</Label>
						<Input placeholder="https://" />
						<FieldError />
					</TextField>
				</FormSection>

				<Separator className="my-6" />

				<FormSection
					description={t("Select or upload an image.")}
					isRequired={true}
					title={t("Image")}
				>
					<ImageSelectField
						defaultPrefix="images"
						initialAssets={initialAssets}
						isRequired={true}
						onChange={setSelectedImage}
						prefixes={["avatars", "images", "logos"]}
						selectedImage={selectedImage}
					/>
				</FormSection>

				<Separator className="my-6" />

				{showRelationFields ? (
					<Fragment>
						<EntityRelationsFields
							formId={formId}
							initialRelatedEntityIds={initialRelatedEntityIds}
							initialRelatedEntityItems={initialRelatedEntityItems}
							initialRelatedEntityTotal={initialRelatedEntityTotal}
							initialRelatedResourceIds={initialRelatedResourceIds}
							initialRelatedResourceItems={initialRelatedResourceItems}
							initialRelatedResourceTotal={initialRelatedResourceTotal}
							selectedRelatedEntities={selectedRelatedEntities}
							selectedRelatedResources={selectedRelatedResources}
						/>

						<Separator className="my-6" />
					</Fragment>
				) : null}

				<FormSection description={t("Add the content.")} title={t("Content")} variant="stacked">
					<ContentBlocks initialAssets={initialAssets} items={contentBlocks ?? []} />
				</FormSection>

				{event != null ? (
					<Fragment>
						<input name="id" type="hidden" value={event.id} />
						<input name="documentId" type="hidden" value={event.entityVersion.entity.id} />
					</Fragment>
				) : null}

				<EntityFormActions entityName={t("Event")} isPending={isPending} state={state} />
			</Form>
		</FormLayout>
	);
}
