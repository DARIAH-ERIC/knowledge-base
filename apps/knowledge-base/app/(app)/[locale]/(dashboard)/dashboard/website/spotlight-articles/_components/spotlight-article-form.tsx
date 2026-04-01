"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, fieldErrorStyles } from "@dariah-eric/ui/field";
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
import { FormSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import type { ServerAction } from "@/lib/server/create-server-action";

interface SpotlightArticleFormProps {
	assets: Array<{ key: string; label: string; url: string }>;
	contentBlocks?: Array<ContentBlock>;
	spotlightArticle?: Pick<schema.SpotlightArticle, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } };
	formAction: ServerAction;
}

export function SpotlightArticleForm(props: Readonly<SpotlightArticleFormProps>): ReactNode {
	const { assets, contentBlocks, formAction, spotlightArticle } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		spotlightArticle?.image ?? null,
	);

	const [imageKeyError, setImageKeyError] = useState(false);

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormSection description={t("Enter the spotlight article details.")} title={t("Details")}>
				<TextField
					aria-label={t("Title")}
					defaultValue={spotlightArticle?.title}
					isRequired={true}
					name="title"
				>
					<Input placeholder={t("Title")} />
					<FieldError />
				</TextField>

				<TextField
					aria-label={t("Summary")}
					defaultValue={spotlightArticle?.summary ?? undefined}
					isRequired={true}
					name="summary"
				>
					<Input placeholder={t("Summary")} />
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
					defaultPrefix="images"
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

			<FormSection description={t("Add the content.")} title={t("Content")}>
				<ContentBlocks items={contentBlocks ?? []} />
			</FormSection>

			{spotlightArticle != null ? (
				<Fragment>
					<input name="id" type="hidden" value={spotlightArticle.id} />
					<input name="documentId" type="hidden" value={spotlightArticle.entity.documentId} />
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
