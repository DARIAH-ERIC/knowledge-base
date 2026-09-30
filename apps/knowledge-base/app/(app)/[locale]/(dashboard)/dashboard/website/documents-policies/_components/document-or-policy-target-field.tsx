"use client";

import { FieldError, Label, fieldErrorStyles } from "@dariah-eric/ui/field";
import { Input } from "@dariah-eric/ui/input";
import { TextField } from "@dariah-eric/ui/text-field";
import { ToggleGroup, ToggleGroupItem } from "@dariah-eric/ui/toggle-group";
import { useExtracted } from "next-intl";
import { type ReactNode, useState } from "react";

import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import {
	type SelectedImage,
	SelectedImageCard,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/selected-image-card";
import type { DocumentOrPolicyKind } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/document-or-policy-target.schema";
import { documentMimeTypes } from "@/config/assets.config";

export function getDocumentOrPolicyKind(item: { linkUrl: string | null }): DocumentOrPolicyKind {
	return item.linkUrl != null ? "link" : "document";
}

interface DocumentOrPolicyKindToggleProps {
	kind: DocumentOrPolicyKind;
	onKindChange: (kind: DocumentOrPolicyKind) => void;
}

/** Switches between an uploaded document and an external link. Submits the choice as `kind`. */
export function DocumentOrPolicyKindToggle(
	props: Readonly<DocumentOrPolicyKindToggleProps>,
): ReactNode {
	const { kind, onKindChange } = props;

	const t = useExtracted();

	return (
		<div className="flex flex-col gap-y-1.5">
			<Label className="block text-sm font-medium">{t("Type")}</Label>
			<ToggleGroup
				aria-label={t("Type")}
				disallowEmptySelection={true}
				onSelectionChange={(keys) => {
					const [key] = [...keys];
					if (key === "document" || key === "link") {
						onKindChange(key);
					}
				}}
				selectedKeys={new Set([kind])}
				selectionMode="single"
			>
				<ToggleGroupItem id="document">{t("Document")}</ToggleGroupItem>
				<ToggleGroupItem id="link">{t("External link")}</ToggleGroupItem>
			</ToggleGroup>
			<input name="kind" type="hidden" value={kind} />
		</div>
	);
}

interface DocumentOrPolicyTargetFieldProps {
	kind: DocumentOrPolicyKind;
	initialAssets: Array<{ key: string; label: string; url: string }>;
	selectedDocument: SelectedImage | null;
	onSelectedDocumentChange: (document: SelectedImage) => void;
	defaultLinkUrl?: string | null;
}

/** The uploaded document picker or the external link input, depending on `kind`. */
export function DocumentOrPolicyTargetField(
	props: Readonly<DocumentOrPolicyTargetFieldProps>,
): ReactNode {
	const { kind, initialAssets, selectedDocument, onSelectedDocumentChange, defaultLinkUrl } = props;

	const t = useExtracted();

	const [documentKeyError, setDocumentKeyError] = useState(false);

	if (kind === "link") {
		return (
			<TextField
				defaultValue={defaultLinkUrl ?? undefined}
				isRequired={true}
				name="linkUrl"
				type="url"
			>
				<Label>{t("Link")}</Label>
				<Input placeholder="https://" />
				<FieldError />
			</TextField>
		);
	}

	const picker = (
		<MediaLibraryDialog
			acceptedFileTypes={documentMimeTypes}
			defaultPrefix="documents"
			initialAssets={initialAssets}
			onSelect={(key, url, asset) => {
				onSelectedDocumentChange({ ...asset, key, url });
				setDocumentKeyError(false);
			}}
			prefixes={["documents"]}
			triggerLabel={selectedDocument != null ? t("Change document") : t("Select document")}
		/>
	);

	return (
		<div>
			{selectedDocument != null ? (
				<SelectedImageCard image={selectedDocument} onMetadataChange={onSelectedDocumentChange}>
					{picker}
				</SelectedImageCard>
			) : (
				picker
			)}
			<input
				aria-hidden={true}
				className="sr-only"
				name="documentKey"
				onInvalid={(e) => {
					e.preventDefault();
					setDocumentKeyError(true);
				}}
				readOnly={true}
				required={true}
				tabIndex={-1}
				value={selectedDocument?.key ?? ""}
			/>
			{documentKeyError ? (
				<div className={fieldErrorStyles()}>{t("Please select a document.")}</div>
			) : null}
		</div>
	);
}
