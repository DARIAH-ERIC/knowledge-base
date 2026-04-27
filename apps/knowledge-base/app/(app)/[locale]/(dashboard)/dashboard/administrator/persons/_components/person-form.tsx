"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, fieldErrorStyles, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { RichTextEditor } from "@dariah-eric/ui/rich-text-editor";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import {
	FormActions,
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import type { ServerAction } from "@/lib/server/create-server-action";

interface PersonFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	person?: Pick<schema.Person, "email" | "id" | "name" | "orcid" | "position" | "sortName"> & {
		biography?: JSONContent;
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
	formAction: ServerAction;
}

export function PersonForm(props: Readonly<PersonFormProps>): ReactNode {
	const { initialAssets, formAction, person } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		person?.image ?? null,
	);

	const [imageKeyError, setImageKeyError] = useState(false);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection
					description={t("Enter the personal and contact details related to the person.")}
					title={t("Details")}
				>
					<TextField defaultValue={person?.name} isRequired={true} name="name">
						<Label>{t("Name")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={person?.sortName} isRequired={true} name="sortName">
						<Label>{t("Sort name")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={person?.email ?? undefined} name="email" type="email">
						<Label>{t("Email")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={person?.orcid ?? undefined} name="orcid">
						<Label>{t("ORCID")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={person?.position ?? undefined} name="position">
						<Label>{t("Position")}</Label>
						<Input />
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
						defaultPrefix="avatars"
						initialAssets={initialAssets}
						onSelect={(key, url) => {
							setSelectedImage({ key, url });
						}}
						prefixes={["avatars"]}
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

				<FormSection
					description={t("Add a short biography.")}
					title={t("Biography")}
					variant="stacked"
				>
					<RichTextEditor content={person?.biography} name="biography" />
				</FormSection>

				{person != null ? (
					<Fragment>
						<input name="id" type="hidden" value={person.id} />
						<input name="documentId" type="hidden" value={person.entity.documentId} />
					</Fragment>
				) : null}

				<FormActions>
					<FormStatus state={state} />
					<Button isDisabled={selectedImage == null} isPending={isPending} type="submit">
						{isPending ? (
							<Fragment>
								<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
								<span aria-hidden={true}>{t("Saving...")}</span>
							</Fragment>
						) : (
							t("Save")
						)}
					</Button>
				</FormActions>
			</Form>
		</FormLayout>
	);
}
