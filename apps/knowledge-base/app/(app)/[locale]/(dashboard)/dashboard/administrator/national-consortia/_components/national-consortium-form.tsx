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

interface NationalConsortiumFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	nationalConsortium?: Pick<
		schema.OrganisationalUnit,
		"acronym" | "id" | "name" | "ror" | "sshocMarketplaceActorId" | "summary"
	> & {
		descriptionContentBlocks?: Array<ContentBlock>;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: SelectedImage | null };
	formId?: string;
	/** Whether the edited entity is published, which freezes its slug. Unused when creating. */
	isPublished?: boolean;
	formAction: ServerAction;
	initialSocialMediaIds?: Array<string>;
	initialSocialMediaItems?: Array<{ id: string; name: string; description?: string }>;
	initialSocialMediaTotal?: number;
	selectedSocialMediaItems?: Array<{ id: string; name: string; description?: string }>;
	showSaveAndPublish?: boolean;
	/** Optional composed sections (e.g. related entities/resources) rendered before the form actions. */
	children?: ReactNode;
}

export function NationalConsortiumForm(props: Readonly<NationalConsortiumFormProps>): ReactNode {
	const {
		initialAssets,
		formAction,
		formId,
		nationalConsortium,
		initialSocialMediaIds,
		initialSocialMediaItems,
		initialSocialMediaTotal,
		selectedSocialMediaItems,
		showSaveAndPublish,
		children,
		isPublished,
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
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

					<TextField defaultValue={nationalConsortium?.ror ?? undefined} name="ror">
						<Label>{t("ROR")}</Label>
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

					<EntitySlugField
						isPublished={isPublished}
						slug={nationalConsortium?.entityVersion.entity.slug}
					/>
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

				<FormSection
					description={t("Add a description.")}
					title={t("Description")}
					variant="stacked"
				>
					<RichTextContentBlocksField
						aria-label={t("Description")}
						initialBlocks={nationalConsortium?.descriptionContentBlocks}
						initialAssets={initialAssets}
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

				{children}

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
