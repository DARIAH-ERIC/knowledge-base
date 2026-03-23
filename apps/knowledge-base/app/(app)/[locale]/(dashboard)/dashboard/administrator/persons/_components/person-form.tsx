"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
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

import { FormSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import type { ServerAction } from "@/lib/server/create-server-action";

interface PersonFormProps {
	assets: Array<{ key: string; url: string }>;
	person?: Pick<schema.Person, "email" | "id" | "name" | "orcid" | "sortName"> & {
		biography?: JSONContent;
		entity: { documentId: string; slug: string };
	} & { image: { key: string; url: string } };
	formAction: ServerAction;
}

export function PersonForm(props: Readonly<PersonFormProps>): ReactNode {
	const { assets, formAction, person } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		person?.image ?? null,
	);

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormSection
				description={t("Enter the personal and contact details related to the person.")}
				title={t("Details")}
			>
				<TextField defaultValue={person?.name} isRequired={true} name="name">
					<Label>{t("Name")}</Label>
					<Input placeholder={t("Name")} />
					<FieldError />
				</TextField>

				<TextField defaultValue={person?.sortName} isRequired={true} name="sortName">
					<Label>{t("Sort name")}</Label>
					<Input placeholder={t("Sort name")} />
					<FieldError />
				</TextField>

				<TextField defaultValue={person?.email ?? undefined} name="email" type="email">
					<Label>{t("Email")}</Label>
					<Input placeholder={t("Email")} />
					<FieldError />
				</TextField>

				<TextField defaultValue={person?.orcid ?? undefined} name="orcid">
					<Label>{t("ORCID")}</Label>
					<Input placeholder={t("ORCID")} />
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
					prefix="avatars"
				/>
			</FormSection>

			<Separator className="my-6" />

			<FormSection description={t("Add a short biography.")} title={t("Biography")}>
				<RichTextEditor content={person?.biography} name="biography" />
			</FormSection>

			{selectedImage != null ? (
				<input name="imageKey" type="hidden" value={selectedImage.key} />
			) : null}

			{person != null ? (
				<Fragment>
					<input name="id" type="hidden" value={person.id} />
					<input name="documentId" type="hidden" value={person.entity.documentId} />
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
	);
}
