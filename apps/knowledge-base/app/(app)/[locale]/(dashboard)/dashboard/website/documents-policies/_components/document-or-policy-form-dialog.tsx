"use client";

import type * as schema from "@dariah-eric/database/schema";
import { type ActionState, createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import {
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@dariah-eric/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { TextField } from "@dariah-eric/ui/text-field";
import { useExtracted } from "next-intl";
import { type ReactNode, useActionState, useState } from "react";

import { DraftFormSubmitButtons } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/draft-form-submit-buttons";
import type { SelectedImage } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/selected-image-card";
import {
	DocumentOrPolicyKindToggle,
	DocumentOrPolicyTargetField,
	getDocumentOrPolicyKind,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/document-or-policy-target-field";
import { createDocumentOrPolicyFromDialogAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/create-document-or-policy-from-dialog.action";
import { updateDocumentOrPolicyDetailsAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/update-document-or-policy-details.action";

export interface DocumentOrPolicyDialogItem {
	id: string;
	title: string;
	summary: string | null;
	url: string | null;
	linkUrl: string | null;
	groupId: string | null;
	document: SelectedImage | null;
}

interface DocumentOrPolicyFormProps {
	item?: DocumentOrPolicyDialogItem | null;
	groups: Array<Pick<schema.DocumentPolicyGroup, "id" | "label">>;
	initialGroupId?: string | null;
	initialAssets: Array<{ key: string; label: string; url: string }>;
	onSuccess: () => void;
}

function DocumentOrPolicyForm(props: Readonly<DocumentOrPolicyFormProps>): ReactNode {
	const { item, groups, initialGroupId, initialAssets, onSuccess } = props;

	const t = useExtracted();

	const isEditMode = item != null;

	const serverAction = isEditMode
		? updateDocumentOrPolicyDetailsAction
		: createDocumentOrPolicyFromDialogAction;

	const [state, formAction, isPending] = useActionState(
		async (prevState: ActionState, formData: FormData) => {
			const result = await serverAction(prevState, formData);
			if (result.status === "success") {
				onSuccess();
			}
			return result;
		},
		createActionStateInitial(),
	);

	const [selectedDocument, setSelectedDocument] = useState<SelectedImage | null>(
		item?.document ?? null,
	);

	const [selectedGroupId, setSelectedGroupId] = useState<string>(
		item?.groupId ?? initialGroupId ?? "",
	);

	const [kind, setKind] = useState(item != null ? getDocumentOrPolicyKind(item) : "document");

	const title = isEditMode ? t("Edit document or policy") : t("New document or policy");

	return (
		<Form action={formAction} state={state}>
			<ModalHeader title={title} />

			<ModalBody className="flex flex-col gap-y-4">
				<FormStatus state={state} />

				{isEditMode && <input name="id" type="hidden" value={item.id} />}

				<TextField defaultValue={item?.title ?? undefined} isRequired={true} name="title">
					<Label>{t("Title")}</Label>
					<Input />
					<FieldError />
				</TextField>

				<TextField defaultValue={item?.summary ?? undefined} name="summary">
					<Label>{t("Summary")}</Label>
					<Input />
					<FieldError />
				</TextField>

				<Select
					onChange={(key) => {
						setSelectedGroupId(key == null || key === "none" ? "" : String(key));
					}}
					value={selectedGroupId || "none"}
				>
					<Label>{t("Group")}</Label>
					<SelectTrigger />
					<FieldError />
					<SelectContent>
						<SelectItem id="none">{t("None")}</SelectItem>
						{groups.map((group) => (
							<SelectItem key={group.id} id={group.id}>
								{group.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{selectedGroupId ? <input name="groupId" type="hidden" value={selectedGroupId} /> : null}

				<DocumentOrPolicyKindToggle kind={kind} onKindChange={setKind} />

				<DocumentOrPolicyTargetField
					defaultLinkUrl={item?.linkUrl}
					initialAssets={initialAssets}
					kind={kind}
					onSelectedDocumentChange={setSelectedDocument}
					selectedDocument={selectedDocument}
				/>

				{kind === "document" ? (
					<TextField defaultValue={item?.url ?? undefined} name="url">
						<Label>{t("URL")}</Label>
						<Input placeholder="https://" />
						<FieldError />
					</TextField>
				) : null}
			</ModalBody>

			<ModalFooter>
				<ModalClose>{t("Cancel")}</ModalClose>
				<DraftFormSubmitButtons
					isDisabled={kind === "document" && selectedDocument == null}
					isPending={isPending}
					showSaveAndPublish={!isEditMode}
				/>
			</ModalFooter>
		</Form>
	);
}

interface DocumentOrPolicyFormDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	item?: DocumentOrPolicyDialogItem | null;
	groups: Array<Pick<schema.DocumentPolicyGroup, "id" | "label">>;
	initialGroupId?: string | null;
	initialAssets: Array<{ key: string; label: string; url: string }>;
}

export function DocumentOrPolicyFormDialog(
	props: Readonly<DocumentOrPolicyFormDialogProps>,
): ReactNode {
	const { isOpen, onOpenChange, item, groups, initialGroupId, initialAssets } = props;

	const [formKey, setFormKey] = useState(0);

	function handleOpenChange(open: boolean) {
		if (open) {
			setFormKey((k) => k + 1);
		}
		onOpenChange(open);
	}

	return (
		<ModalContent isOpen={isOpen} onOpenChange={handleOpenChange} size="md">
			<DocumentOrPolicyForm
				key={`${String(formKey)}-${item?.id ?? "new"}`}
				groups={groups}
				initialAssets={initialAssets}
				initialGroupId={initialGroupId}
				item={item}
				onSuccess={() => {
					onOpenChange(false);
				}}
			/>
		</ModalContent>
	);
}
