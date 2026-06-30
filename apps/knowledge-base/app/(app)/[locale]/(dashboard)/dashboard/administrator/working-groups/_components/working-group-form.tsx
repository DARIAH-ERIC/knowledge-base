"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
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
import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import { RichTextContentBlocksField } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/rich-text-content-blocks-field";
import { SocialMediaRelationsFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/social-media-relations-fields";
import type { ServerAction } from "@/lib/server/create-server-action";

interface WorkingGroupFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	workingGroup?: Pick<
		schema.OrganisationalUnit,
		"acronym" | "email" | "id" | "mailingList" | "name" | "sshocMarketplaceActorId" | "summary"
	> & {
		descriptionContentBlocks?: Array<ContentBlock>;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } | null };
	formId?: string;
	formAction: ServerAction;
	initialSocialMediaIds?: Array<string>;
	initialSocialMediaItems?: Array<{ id: string; name: string; description?: string }>;
	initialSocialMediaTotal?: number;
	selectedSocialMediaItems?: Array<{ id: string; name: string; description?: string }>;
	showSaveAndPublish?: boolean;
	/** Optional composed sections (e.g. related entities/resources) rendered before the form actions. */
	children?: ReactNode;
}

export function WorkingGroupForm(props: Readonly<WorkingGroupFormProps>): ReactNode {
	const {
		initialAssets,
		formAction,
		formId,
		workingGroup,
		initialSocialMediaIds,
		initialSocialMediaItems,
		initialSocialMediaTotal,
		selectedSocialMediaItems,
		showSaveAndPublish,
		children,
	} = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		workingGroup?.image ?? null,
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" id={formId} state={state}>
				<FormSection description={t("Enter the working group details.")} title={t("Details")}>
					<TextField defaultValue={workingGroup?.name} isRequired={true} name="name">
						<Label>{t("Name")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={workingGroup?.acronym ?? undefined} name="acronym">
						<Label>{t("Acronym")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField
						defaultValue={
							workingGroup?.sshocMarketplaceActorId != null
								? String(workingGroup.sshocMarketplaceActorId)
								: undefined
						}
						name="sshocMarketplaceActorId"
						type="number"
					>
						<Label>{t("SSHOC actor ID")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={workingGroup?.summary ?? undefined} name="summary">
						<Label>{t("Summary")}</Label>
						<TextArea rows={5} />
						<FieldError />
					</TextField>
				</FormSection>

				<Separator className="my-6" />

				<FormSection
					description={t("Enter the working group contact details.")}
					title={t("Contact")}
				>
					<TextField defaultValue={workingGroup?.email ?? undefined} name="email" type="email">
						<Label>{t("Email")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={workingGroup?.mailingList ?? undefined} name="mailingList">
						<Label>{t("Mailing list")}</Label>
						<Input />
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
					<RichTextContentBlocksField
						aria-label={t("Description")}
						initialBlocks={workingGroup?.descriptionContentBlocks}
						initialAssets={initialAssets}
						name="description"
					/>
				</FormSection>

				<Separator className="my-6" />

				{initialSocialMediaItems != null && initialSocialMediaTotal != null ? (
					<Fragment>
						<SocialMediaRelationsFields
							description={t("Link social media accounts to this working group.")}
							initialSocialMediaIds={initialSocialMediaIds}
							initialSocialMediaItems={initialSocialMediaItems}
							initialSocialMediaTotal={initialSocialMediaTotal}
							selectedSocialMediaItems={selectedSocialMediaItems}
						/>

						<Separator className="my-6" />
					</Fragment>
				) : null}

				{children}

				{workingGroup != null ? (
					<Fragment>
						<input name="id" type="hidden" value={workingGroup.id} />
						<input name="documentId" type="hidden" value={workingGroup.entityVersion.entity.id} />
					</Fragment>
				) : null}

				<EntityFormActions
					entityName={t("Working group")}
					isPending={isPending}
					showSaveAndPublish={showSaveAndPublish}
					state={state}
				/>
			</Form>
		</FormLayout>
	);
}
