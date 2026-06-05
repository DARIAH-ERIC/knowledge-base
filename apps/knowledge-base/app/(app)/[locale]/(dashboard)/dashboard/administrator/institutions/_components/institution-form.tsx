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

interface InstitutionFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	institution?: Pick<
		schema.OrganisationalUnit,
		"acronym" | "id" | "name" | "ror" | "sshocMarketplaceActorId" | "summary"
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
}

export function InstitutionForm(props: Readonly<InstitutionFormProps>): ReactNode {
	const {
		initialAssets,
		formAction,
		formId,
		institution,
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
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		institution?.image ?? null,
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" id={formId} state={state}>
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

					<TextField defaultValue={institution?.ror ?? undefined} name="ror">
						<Label>{t("ROR")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField
						defaultValue={
							institution?.sshocMarketplaceActorId != null
								? String(institution.sshocMarketplaceActorId)
								: undefined
						}
						name="sshocMarketplaceActorId"
						type="number"
					>
						<Label>{t("SSHOC actor ID")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={institution?.summary ?? undefined} name="summary">
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
							className="block-24 inline-auto max-inline-full rounded-lg object-cover"
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
						content={institution?.description}
						name="description"
					/>
				</FormSection>

				<Separator className="my-6" />

				{initialSocialMediaItems != null && initialSocialMediaTotal != null ? (
					<Fragment>
						<SocialMediaRelationsFields
							description={t("Link social media accounts to this institution.")}
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

				{institution != null ? (
					<Fragment>
						<input name="id" type="hidden" value={institution.id} />
						<input name="documentId" type="hidden" value={institution.entityVersion.entity.id} />
					</Fragment>
				) : null}

				<EntityFormActions entityName={t("Institution")} isPending={isPending} state={state} />
			</Form>
		</FormLayout>
	);
}
