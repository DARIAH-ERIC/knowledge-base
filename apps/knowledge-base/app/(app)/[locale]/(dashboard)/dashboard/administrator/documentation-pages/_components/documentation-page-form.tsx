"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState } from "react";

import {
	type ContentBlock,
	ContentBlocks,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import {
	FormActions,
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import type { ServerAction } from "@/lib/server/create-server-action";

interface DocumentationPageFormProps {
	contentBlocks?: Array<ContentBlock>;
	documentationPage?: Pick<schema.DocumentationPage, "id" | "title"> & {
		entity: Pick<schema.Entity, "documentId">;
	};
	formAction: ServerAction;
}

export function DocumentationPageForm(props: Readonly<DocumentationPageFormProps>): ReactNode {
	const { contentBlocks, documentationPage, formAction } = props;

	const t = useExtracted();
	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection description={t("Enter the documentation page details.")} title={t("Details")}>
					<TextField defaultValue={documentationPage?.title} isRequired={true} name="title">
						<Label>{t("Title")}</Label>
						<Input />
						<FieldError />
					</TextField>
				</FormSection>

				<Separator className="my-6" />

				<FormSection description={t("Add the content.")} title={t("Content")} variant="stacked">
					<ContentBlocks items={contentBlocks ?? []} />
				</FormSection>

				{documentationPage != null ? (
					<Fragment>
						<input name="id" type="hidden" value={documentationPage.id} />
						<input name="documentId" type="hidden" value={documentationPage.entity.documentId} />
					</Fragment>
				) : null}

				<FormActions>
					<FormStatus state={state} />
					<Button isPending={isPending} type="submit">
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
