"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import {
	MultipleSelect,
	MultipleSelectContent,
	MultipleSelectItem,
} from "@dariah-eric/ui/multiple-select";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { RichTextEditor } from "@dariah-eric/ui/rich-text-editor";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import type { ServerAction } from "@/lib/server/create-server-action";

interface InstitutionFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	institution?: Pick<schema.OrganisationalUnit, "acronym" | "id" | "name" | "summary"> & {
		description?: JSONContent;
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } | null };
	formAction: ServerAction;
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
	initialRelatedEntityIds?: Array<string>;
	initialRelatedResourceIds?: Array<string>;
}

export function InstitutionForm(props: Readonly<InstitutionFormProps>): ReactNode {
	const {
		initialAssets,
		formAction,
		institution,
		relatedEntities,
		relatedResources,
		initialRelatedEntityIds,
		initialRelatedResourceIds,
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		institution?.image ?? null,
	);

	const [selectedEntityIds, setSelectedEntityIds] = useState<Array<string>>(
		initialRelatedEntityIds ?? [],
	);

	const [selectedResourceIds, setSelectedResourceIds] = useState<Array<string>>(
		initialRelatedResourceIds ?? [],
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection description={t("Enter the institution details.")} title={t("Details")}>
					<TextField defaultValue={institution?.name} isRequired={true} name="name">
						<Label>{t("Name")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={institution?.acronym ?? undefined} name="acronym">
						<Label>{t("Acronym")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={institution?.summary} isRequired={true} name="summary">
						<Label>{t("Summary")}</Label>
						<TextArea />
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
						defaultPrefix="logos"
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
						readOnly={true}
						tabIndex={-1}
						value={selectedImage?.key ?? ""}
					/>
				</FormSection>

				<Separator className="my-6" />

				<FormSection
					description={t("Add a description.")}
					title={t("Description")}
					variant="stacked"
				>
					<RichTextEditor
						aria-label={t("Description")}
						content={institution?.description}
						name="description"
					/>
				</FormSection>

				<Separator className="my-6" />

				<FormSection description={t("Link related entities.")} title={t("Related entities")}>
					<MultipleSelect
						aria-label={t("Related entities")}
						onChange={(keys) => {
							setSelectedEntityIds(keys.map(String));
						}}
						placeholder={t("No related entities")}
						value={selectedEntityIds}
					>
						<MultipleSelectContent items={relatedEntities}>
							{(item) => {
								return <MultipleSelectItem id={item.id}>{item.name}</MultipleSelectItem>;
							}}
						</MultipleSelectContent>
					</MultipleSelect>
					{selectedEntityIds.map((entityId, index) => {
						return (
							<input
								key={entityId}
								name={`relatedEntityIds.${String(index)}`}
								type="hidden"
								value={entityId}
							/>
						);
					})}
				</FormSection>

				<Separator className="my-6" />

				<FormSection description={t("Link related resources.")} title={t("Related resources")}>
					<MultipleSelect
						aria-label={t("Related resources")}
						onChange={(keys) => {
							setSelectedResourceIds(keys.map(String));
						}}
						placeholder={t("No related resources")}
						value={selectedResourceIds}
					>
						<MultipleSelectContent
							items={relatedResources.map((r) => {
								return { id: r.id, name: r.label };
							})}
						>
							{(item) => {
								return <MultipleSelectItem id={item.id}>{item.name}</MultipleSelectItem>;
							}}
						</MultipleSelectContent>
					</MultipleSelect>
					{selectedResourceIds.map((resourceId, index) => {
						return (
							<input
								key={resourceId}
								name={`relatedResourceIds.${String(index)}`}
								type="hidden"
								value={resourceId}
							/>
						);
					})}
				</FormSection>

				{institution != null ? (
					<Fragment>
						<input name="id" type="hidden" value={institution.id} />
						<input name="documentId" type="hidden" value={institution.entity.documentId} />
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
		</FormLayout>
	);
}
