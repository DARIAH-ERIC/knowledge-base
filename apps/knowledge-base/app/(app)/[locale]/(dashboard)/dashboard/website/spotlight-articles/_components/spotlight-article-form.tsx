"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, fieldErrorStyles, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import {
	type ContentBlock,
	ContentBlocks,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-relations-fields";
import {
	FormActions,
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import type { ServerAction } from "@/lib/server/create-server-action";

interface SpotlightArticleFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks?: Array<ContentBlock>;
	spotlightArticle?: Pick<schema.SpotlightArticle, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
	formAction: ServerAction;
	initialRelatedEntityIds?: Array<string>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds?: Array<string>;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
	selectedRelatedEntities?: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources?: Array<{ id: string; name: string; description?: string }>;
}

export function SpotlightArticleForm(props: Readonly<SpotlightArticleFormProps>): ReactNode {
	const {
		initialAssets,
		contentBlocks,
		formAction,
		spotlightArticle,
		initialRelatedEntityIds,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceIds,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		selectedRelatedEntities,
		selectedRelatedResources,
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		spotlightArticle?.image ?? null,
	);

	const [imageKeyError, setImageKeyError] = useState(false);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection description={t("Enter the spotlight article details.")} title={t("Details")}>
					<TextField defaultValue={spotlightArticle?.title} isRequired={true} name="title">
						<Label>{t("Title")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField
						defaultValue={spotlightArticle?.summary ?? undefined}
						isRequired={true}
						name="summary"
					>
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

				<Separator className="my-6" />

				<FormSection description={t("Add the content.")} title={t("Content")} variant="stacked">
					<ContentBlocks initialAssets={initialAssets} items={contentBlocks ?? []} />
				</FormSection>

				{spotlightArticle != null ? (
					<Fragment>
						<input name="id" type="hidden" value={spotlightArticle.id} />
						<input name="documentId" type="hidden" value={spotlightArticle.entity.documentId} />
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
