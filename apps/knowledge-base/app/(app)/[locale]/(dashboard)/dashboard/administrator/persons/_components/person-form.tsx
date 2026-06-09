"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { Input } from "@dariah-eric/ui/input";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import { EntityFormActions } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form-actions";
import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { ImageSelectField } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/image-select-field";
import { RichTextContentBlocksField } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/rich-text-content-blocks-field";
import type { ServerAction } from "@/lib/server/create-server-action";

interface PersonFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	person?: Pick<schema.Person, "email" | "id" | "name" | "orcid" | "sortName"> & {
		biography?: JSONContent;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } | null };
	formAction: ServerAction;
}

export function PersonForm(props: Readonly<PersonFormProps>): ReactNode {
	const { initialAssets, formAction, person } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		person?.image ?? null,
	);

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
				</FormSection>

				<Separator className="my-6" />

				<FormSection description={t("Select or upload an image.")} title={t("Image")}>
					<ImageSelectField
						allowRemove={true}
						defaultPrefix="avatars"
						initialAssets={initialAssets}
						onChange={setSelectedImage}
						prefixes={["avatars"]}
						selectedImage={selectedImage}
					/>
				</FormSection>

				<Separator className="my-6" />

				<FormSection
					description={t("Add a short biography.")}
					title={t("Biography")}
					variant="stacked"
				>
					<RichTextContentBlocksField
						aria-label={t("Biography")}
						content={person?.biography}
						initialAssets={initialAssets}
						name="biography"
					/>
				</FormSection>

				{person != null ? (
					<Fragment>
						<input name="id" type="hidden" value={person.id} />
						<input name="documentId" type="hidden" value={person.entityVersion.entity.id} />
					</Fragment>
				) : null}

				<EntityFormActions entityName={t("Person")} isPending={isPending} state={state} />
			</Form>
		</FormLayout>
	);
}
