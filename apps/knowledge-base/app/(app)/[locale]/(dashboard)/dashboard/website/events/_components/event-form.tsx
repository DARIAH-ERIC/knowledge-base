"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { DatePicker, DatePickerTrigger } from "@dariah-eric/ui/date-picker";
import { FieldError, fieldErrorStyles, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
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
import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import type { ServerAction } from "@/lib/server/create-server-action";

interface EventFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks?: Array<ContentBlock>;
	event?: Pick<schema.Event, "id" | "duration" | "location" | "title" | "summary" | "website"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
	formAction: ServerAction;
}

export function EventForm(props: Readonly<EventFormProps>): ReactNode {
	const { initialAssets, contentBlocks, formAction, event } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		event?.image ?? null,
	);

	const [imageKeyError, setImageKeyError] = useState(false);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection description={t("Enter the event details.")} title={t("Details")}>
					<TextField defaultValue={event?.title} isRequired={true} name="title">
						<Label>{t("Title")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={event?.summary ?? undefined} isRequired={true} name="summary">
						<Label>{t("Summary")}</Label>
						<Input />
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

				<FormSection description={t("Select or upload an image.")} title={t("Image")}>
					{selectedImage != null && (
						<img
							alt={t("Selected image")}
							className="size-24 rounded-lg object-cover"
							src={selectedImage.url}
						/>
					)}
					<MediaLibraryDialog
						defaultPrefix="images"
						initialAssets={initialAssets}
						onSelect={(key, url) => {
							setSelectedImage({ key, url });
						}}
						prefixes={["avatars", "images", "logos"]}
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

				<FormSection description={t("Add the content.")} title={t("Content")} variant="stacked">
					<ContentBlocks initialAssets={initialAssets} items={contentBlocks ?? []} />
				</FormSection>

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

				<FormStatus className="self-end" state={state} />
			</Form>
		</FormLayout>
	);
}
