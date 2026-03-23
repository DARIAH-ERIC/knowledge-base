"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { DatePicker, DatePickerTrigger } from "@dariah-eric/ui/date-picker";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { Input } from "@dariah-eric/ui/input";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { CalendarDate } from "@internationalized/date";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import {
	type ContentBlock,
	ContentBlocks,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { FormSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import type { ServerAction } from "@/lib/server/create-server-action";

interface EventFormProps {
	assets: Array<{ key: string; url: string }>;
	contentBlocks?: Array<ContentBlock>;
	event?: Pick<schema.Event, "id" | "duration" | "location" | "title" | "summary" | "website"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; url: string } };
	formAction: ServerAction;
}

export function EventForm(props: Readonly<EventFormProps>): ReactNode {
	const { assets, contentBlocks, formAction, event } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		event?.image ?? null,
	);

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormSection description={t("Enter the event details.")} title={t("Details")}>
				<TextField
					aria-label={t("Title")}
					defaultValue={event?.title}
					isRequired={true}
					name="title"
				>
					<Input placeholder={t("Title")} />
					<FieldError />
				</TextField>

				<TextField
					aria-label={t("Summary")}
					defaultValue={event?.summary ?? undefined}
					isRequired={true}
					name="summary"
				>
					<Input placeholder={t("Summary")} />
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
				<TextField
					aria-label={t("Location")}
					defaultValue={event?.location ?? undefined}
					isRequired={true}
					name="location"
				>
					<Input placeholder={t("Location")} />
					<FieldError />
				</TextField>
				<TextField
					aria-label={t("Website")}
					defaultValue={event?.website ?? undefined}
					name="website"
					type="url"
				>
					<Input placeholder={t("Website")} />
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

			<FormSection description={t("Add the content.")} title={t("Content")}>
				<ContentBlocks items={contentBlocks ?? []} />
			</FormSection>

			{selectedImage != null ? (
				<input name="imageKey" type="hidden" value={selectedImage.key} />
			) : null}

			{event != null ? (
				<Fragment>
					<input name="id" type="hidden" value={event.id} />
					<input name="documentId" type="hidden" value={event.entity.documentId} />
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
