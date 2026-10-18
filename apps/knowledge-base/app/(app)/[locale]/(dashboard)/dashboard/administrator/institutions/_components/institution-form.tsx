"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { Input } from "@dariah-eric/ui/input";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityFormActions } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form-actions";
import { EntityRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-relations-fields";
import { EntitySlugField } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-slug-field";
import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import {
	ImageSelectField,
	type SelectedImage,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/image-select-field";
import { RichTextContentBlocksField } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/rich-text-content-blocks-field";
import { SocialMediaRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/social-media-relations-fields";
import type { ServerAction } from "@/lib/server/create-server-action";

interface InstitutionFormFieldsProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	institution?: Pick<
		schema.OrganisationalUnit,
		"acronym" | "name" | "ror" | "sshocMarketplaceActorId" | "summary"
	> & {
		descriptionContentBlocks?: Array<ContentBlock>;
		entityVersion: { entity: { slug: string } };
	} & { image: SelectedImage | null };
	/** Whether the edited entity is published, which freezes its slug. Unused when creating. */
	isPublished?: boolean;
	initialSocialMediaIds?: Array<string>;
	initialSocialMediaItems?: Array<{ id: string; name: string; description?: string }>;
	initialSocialMediaTotal?: number;
	selectedSocialMediaItems?: Array<{ id: string; name: string; description?: string }>;
}

/**
 * The fields of an institution, without the surrounding form and the admin-only relation fields.
 * Shared by `InstitutionForm` and the sheet that creates an institution from the country
 * dashboard.
 */
export function InstitutionFormFields(props: Readonly<InstitutionFormFieldsProps>): ReactNode {
	const {
		initialAssets,
		institution,
		initialSocialMediaIds,
		initialSocialMediaItems,
		initialSocialMediaTotal,
		selectedSocialMediaItems,
		isPublished,
	} = props;

	const t = useExtracted();

	const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
		institution?.image ?? null,
	);

	return (
		<Fragment>
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
					<TextArea rows={5} />
					<FieldError />
				</TextField>

				<EntitySlugField isPublished={isPublished} slug={institution?.entityVersion.entity.slug} />
			</FormSection>

			<Separator className="my-6" />

			<FormSection description={t("Select or upload an image.")} title={t("Image")}>
				<ImageSelectField
					allowRemove={true}
					defaultPrefix="logos"
					initialAssets={initialAssets}
					onChange={setSelectedImage}
					prefixes={["avatars", "images", "logos"]}
					selectedImage={selectedImage}
				/>
			</FormSection>

			<Separator className="my-6" />

			<FormSection description={t("Add a description.")} title={t("Description")} variant="stacked">
				<RichTextContentBlocksField
					aria-label={t("Description")}
					initialBlocks={institution?.descriptionContentBlocks}
					initialAssets={initialAssets}
					name="description"
				/>
			</FormSection>

			{initialSocialMediaItems != null && initialSocialMediaTotal != null ? (
				<Fragment>
					<Separator className="my-6" />

					<SocialMediaRelationsFields
						description={t("Link social media accounts to this institution.")}
						initialSocialMediaIds={initialSocialMediaIds}
						initialSocialMediaItems={initialSocialMediaItems}
						initialSocialMediaTotal={initialSocialMediaTotal}
						selectedSocialMediaItems={selectedSocialMediaItems}
					/>
				</Fragment>
			) : null}
		</Fragment>
	);
}

interface InstitutionFormProps extends InstitutionFormFieldsProps {
	institution?: NonNullable<InstitutionFormFieldsProps["institution"]> &
		Pick<schema.OrganisationalUnit, "id"> & { entityVersion: { entity: { id: string } } };
	formId?: string;
	formAction: ServerAction;
	initialRelatedEntityIds?: Array<string>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds?: Array<string>;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
	selectedRelatedEntities?: Array<{ id: string; name: string; description?: string }>;
	selectedRelatedResources?: Array<{ id: string; name: string; description?: string }>;
	showRelationFields?: boolean;
}

export function InstitutionForm(props: Readonly<InstitutionFormProps>): ReactNode {
	const {
		formAction,
		formId,
		institution,
		initialRelatedEntityIds,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceIds,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		selectedRelatedEntities,
		selectedRelatedResources,
		showRelationFields = true,
		...fieldsProps
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" id={formId} state={state}>
				<InstitutionFormFields {...fieldsProps} institution={institution} />

				{showRelationFields ? (
					<Fragment>
						<Separator className="my-6" />

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
					</Fragment>
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
