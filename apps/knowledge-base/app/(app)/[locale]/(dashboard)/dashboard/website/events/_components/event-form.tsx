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
import {
	CalendarDate,
	CalendarDateTime,
	type DateValue,
	toCalendarDate,
	toCalendarDateTime,
} from "@internationalized/date";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import {
	type ContentBlock,
	ContentBlocks,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityFormActions } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form-actions";
import { EntityRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-relations-fields";
import { EntitySlugField } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-slug-field";
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
	/** Whether the edited entity is published, which freezes its slug. Unused when creating. */
	isPublished?: boolean;
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

/**
 * Build a timezone-agnostic picker value from a stored UTC instant, reading UTC components so the
 * displayed wall-clock matches the stored value (the app treats UTC as a standin for the event's
 * local time). All-day events use a date-only `CalendarDate`; timed events a `CalendarDateTime`.
 */
function toDateValue(date: Date, isFullDay: boolean): DateValue {
	return isFullDay
		? new CalendarDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
		: new CalendarDateTime(
				date.getUTCFullYear(),
				date.getUTCMonth() + 1,
				date.getUTCDate(),
				date.getUTCHours(),
				date.getUTCMinutes(),
			);
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
		isPublished,
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		event?.image ?? null,
	);

	const [isFullDay, setIsFullDay] = useState(event?.isFullDay ?? false);
	const [start, setStart] = useState<DateValue | null>(
		event != null ? toDateValue(event.duration.start, event.isFullDay) : null,
	);
	const [end, setEnd] = useState<DateValue | null>(
		event?.duration.end != null ? toDateValue(event.duration.end, event.isFullDay) : null,
	);

	function handleFullDayChange(nextIsFullDay: boolean) {
		setIsFullDay(nextIsFullDay);
		const convert = (value: DateValue | null): DateValue | null => {
			if (value == null) {
				return null;
			}
			return nextIsFullDay ? toCalendarDate(value) : toCalendarDateTime(value);
		};
		setStart(convert);
		setEnd(convert);
	}

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
						<TextArea rows={5} />
						<FieldError />
					</TextField>
					<Checkbox
						isSelected={isFullDay}
						name="isFullDay"
						onChange={handleFullDayChange}
						value="true"
					>
						{t("Full day")}
					</Checkbox>
					<DatePicker
						granularity={isFullDay ? "day" : "minute"}
						hideTimeZone={true}
						isRequired={true}
						name="duration.start"
						onChange={setStart}
						value={start}
					>
						<Label>{isFullDay ? t("Start date") : t("Start")}</Label>
						<DatePickerTrigger />
						<FieldError />
					</DatePicker>

					<DatePicker
						granularity={isFullDay ? "day" : "minute"}
						hideTimeZone={true}
						name="duration.end"
						onChange={setEnd}
						value={end}
					>
						<Label>{isFullDay ? t("End date") : t("End")}</Label>
						<DatePickerTrigger />
						<FieldError />
					</DatePicker>
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

					<EntitySlugField isPublished={isPublished} slug={event?.entityVersion.entity.slug} />
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
