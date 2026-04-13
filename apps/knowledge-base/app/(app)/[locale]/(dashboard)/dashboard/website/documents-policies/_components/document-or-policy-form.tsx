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
import { FormSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import type { ServerAction } from "@/lib/server/create-server-action";

interface DocumentOrPolicyFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	contentBlocks?: Array<ContentBlock>;
	documentOrPolicy?: Pick<schema.DocumentOrPolicy, "id" | "title" | "summary" | "url"> & {
		entity: { documentId: string; slug: string };
	} & { document: { key: string; label: string; url: string } };
	formAction: ServerAction;
}

export function DocumentOrPolicyForm(props: Readonly<DocumentOrPolicyFormProps>): ReactNode {
	const { initialAssets, contentBlocks, formAction, documentOrPolicy } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedDocument, setSelectedDocument] = useState<{ key: string; label: string } | null>(
		documentOrPolicy?.document
			? { key: documentOrPolicy.document.key, label: documentOrPolicy.document.label }
			: null,
	);

	const [documentKeyError, setDocumentKeyError] = useState(false);

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormSection description={t("Enter the document or policy details.")} title={t("Details")}>
				<TextField defaultValue={documentOrPolicy?.title} isRequired={true} name="title">
					<Label>{t("Title")}</Label>
					<Input />
					<FieldError />
				</TextField>

				<TextField
					defaultValue={documentOrPolicy?.summary ?? undefined}
					isRequired={true}
					name="summary"
				>
					<Label>{t("Summary")}</Label>
					<Input />
					<FieldError />
				</TextField>

				<TextField defaultValue={documentOrPolicy?.url ?? undefined} name="url">
					<Label>{t("URL")}</Label>
					<Input placeholder="https://" />
					<FieldError />
				</TextField>
			</FormSection>

			<Separator className="my-6" />

			<FormSection description={t("Select or upload a document.")} title={t("Document")}>
				{selectedDocument != null && (
					<p className="text-sm text-muted-fg">{selectedDocument.label}</p>
				)}
				<MediaLibraryDialog
					defaultPrefix="documents"
					initialAssets={initialAssets}
					onSelect={(key, _url) => {
						const asset = initialAssets.find((a) => {
							return a.key === key;
						});
						setSelectedDocument({ key, label: asset?.label ?? key });
					}}
					prefixes={["documents"]}
				/>

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
			</FormSection>

			<Separator className="my-6" />

			<FormSection description={t("Add the content.")} title={t("Content")} variant="stacked">
				<ContentBlocks initialAssets={initialAssets} items={contentBlocks ?? []} />
			</FormSection>

			{documentOrPolicy != null ? (
				<Fragment>
					<input name="id" type="hidden" value={documentOrPolicy.id} />
					<input name="documentId" type="hidden" value={documentOrPolicy.entity.documentId} />
				</Fragment>
			) : null}

			<Button
				className="self-end"
				isDisabled={selectedDocument == null}
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
