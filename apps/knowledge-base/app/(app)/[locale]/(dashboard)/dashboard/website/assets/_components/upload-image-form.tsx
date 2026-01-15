"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { uploadImageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/actions/upload-image-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createInitialActionState, getFieldErrors } from "@/lib/server/actions";

// TODO: use getPresignedUploadUrl to upload directly from the client to the object store, and then
// call a server action to create a record in the assets table for that object key.

export function UploadImageForm(): ReactNode {
	const t = useTranslations("UploadImageForm");

	const [state, action] = useActionState(uploadImageAction, createInitialActionState({}));

	return (
		<Form action={action} className="grid gap-y-6" validationErrors={getFieldErrors(state)}>
			<FormStatus state={state} />

			<label>
				<div>{t("input")}</div>
				<input accept="image/png, image/jpeg" name="file" required={true} type="file" />
			</label>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
