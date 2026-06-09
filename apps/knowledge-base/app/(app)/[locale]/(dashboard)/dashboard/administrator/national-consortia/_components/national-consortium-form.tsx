"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { Input } from "@dariah-eric/ui/input";
import { RichTextEditor } from "@dariah-eric/ui/rich-text-editor";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import { EntityFormActions } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form-actions";
import { EntityRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-relations-fields";
import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import { SocialMediaRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/social-media-relations-fields";
import type { ServerAction } from "@/lib/server/create-server-action";

interface NationalConsortiumFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	nationalConsortium?: Pick<
		schema.OrganisationalUnit,
		"acronym" | "id" | "name" | "sshocMarketplaceActorId" | "summary"
	> & {
		description?: JSONContent;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } | null };
	formId?: string;
	formAction: ServerAction;
	initialRelatedEntityIds?: Array<string>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds?: Array<string>;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
	initialSocialMediaIds?: Array<string>;
	initialSocialMediaItems?: Array<{ id: string; name: string; description?: string }>;
	initialSocialMediaTotal?: number;
	selectedRelatedEntities?: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources?: Array<{ id: string; name: string; description?: string }>;
	selectedSocialMediaItems?: Array<{ id: string; name: string; description?: string }>;
	showRelationFields?: boolean;
	showSaveAndPublish?: boolean;
}

export function NationalConsortiumForm(props: Readonly<NationalConsortiumFormProps>): ReactNode {
	const {
		initialAssets,
		formAction,
		formId,
		nationalConsortium,
		initialRelatedEntityIds,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceIds,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		initialSocialMediaIds,
		initialSocialMediaItems,
		initialSocialMediaTotal,
		selectedRelatedEntities,
		selectedRelatedResources,
		selectedSocialMediaItems,
		showRelationFields = true,
		showSaveAndPublish,
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		nationalConsortium?.image ?? null,
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" id={formId} state={state}>
				<FormSection description={t("Enter the national consortium details.")} title={t("Details")}>
					<TextField defaultValue={nationalConsortium?.name} isRequired={true} name="name">
						<Label>{t("Name")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={nationalConsortium?.acronym ?? undefined} name="acronym">
						<Label>{t("Acronym")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField
						defaultValue={
							nationalConsortium?.sshocMarketplaceActorId != null
								? String(nationalConsortium.sshocMarketplaceActorId)
								: undefined
						}
						name="sshocMarketplaceActorId"
						type="number"
					>
						<Label>{t("SSHOC actor ID")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={nationalConsortium?.summary ?? undefined} name="summary">
						<Label>{t("Summary")}</Label>
						<TextArea rows={5} />
						<FieldError />
					</TextField>
				</FormSection>

				<Separator className="my-6" />

				<FormSection description={t("Select or upload an image.")} title={t("Image")}>
					{selectedImage != null && (
						<img
							alt={t("Selected image")}
							className="block-24 inline-auto max-inline-full rounded-lg object-contain"
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
					{selectedImage != null ? (
						<Button
							intent="outline"
							onPress={() => {
								setSelectedImage(null);
							}}
						>
							{t("Remove image")}
						</Button>
					) : null}

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
						content={nationalConsortium?.description}
						name="description"
					/>
				</FormSection>

				<Separator className="my-6" />

				{initialSocialMediaItems != null && initialSocialMediaTotal != null ? (
					<Fragment>
						<SocialMediaRelationsFields
							description={t("Link social media accounts to this national consortium.")}
							initialSocialMediaIds={initialSocialMediaIds}
							initialSocialMediaItems={initialSocialMediaItems}
							initialSocialMediaTotal={initialSocialMediaTotal}
							selectedSocialMediaItems={selectedSocialMediaItems}
						/>

						<Separator className="my-6" />
					</Fragment>
				) : null}

				{showRelationFields ? (
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
				) : null}

				{nationalConsortium != null ? (
					<Fragment>
						<input name="id" type="hidden" value={nationalConsortium.id} />
						<input
							name="documentId"
							type="hidden"
							value={nationalConsortium.entityVersion.entity.id}
						/>
					</Fragment>
				) : null}

				<EntityFormActions
					entityName={t("National consortium")}
					isPending={isPending}
					showSaveAndPublish={showSaveAndPublish}
					state={state}
				/>
			</Form>
		</FormLayout>
	);
}
