"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, fieldErrorStyles, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import {
	MultipleSelect,
	MultipleSelectContent,
	MultipleSelectItem,
} from "@dariah-eric/ui/multiple-select";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
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

interface PageItemFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks?: Array<ContentBlock>;
	pageItem?: Pick<schema.Page, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } | null };
	formAction: ServerAction;
	relatedEntities: Array<{ id: string; name: string }>;
	relatedResources: Array<{ id: string; label: string }>;
	initialRelatedEntityIds?: Array<string>;
	initialRelatedResourceIds?: Array<string>;
}

export function PageItemForm(props: Readonly<PageItemFormProps>): ReactNode {
	const {
		initialAssets,
		contentBlocks,
		formAction,
		pageItem,
		relatedEntities,
		relatedResources,
		initialRelatedEntityIds,
		initialRelatedResourceIds,
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		pageItem?.image ?? null,
	);

	const [imageKeyError, setImageKeyError] = useState(false);

	const [selectedEntityIds, setSelectedEntityIds] = useState<Array<string>>(
		initialRelatedEntityIds ?? [],
	);

	const [selectedResourceIds, setSelectedResourceIds] = useState<Array<string>>(
		initialRelatedResourceIds ?? [],
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection description={t("Enter the page details.")} title={t("Details")}>
					<TextField defaultValue={pageItem?.title} isRequired={true} name="title">
						<Label>{t("Title")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={pageItem?.summary ?? undefined} isRequired={true} name="summary">
						<Label>{t("Summary")}</Label>
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

				<Separator className="my-6" />

				<FormSection description={t("Add the content.")} title={t("Content")} variant="stacked">
					<ContentBlocks initialAssets={initialAssets} items={contentBlocks ?? []} />
				</FormSection>

				{pageItem != null ? (
					<Fragment>
						<input name="id" type="hidden" value={pageItem.id} />
						<input name="documentId" type="hidden" value={pageItem.entity.documentId} />
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
