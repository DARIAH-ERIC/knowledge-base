"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { uploadImageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/upload-image.action";
import { Form } from "@/components/form";
import { FormErrorMessage } from "@/components/form-error-message";
import { FormStatus } from "@/components/form-status";
import { FormSuccessMessage } from "@/components/form-success-message";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

/**
 * TODO: use getPresignedUploadUrl to upload directly from the client to the object store, and then
 * call a server action to create a record in the assets table for that object key.
 */

export function UploadImageForm(): ReactNode {
	const t = useTranslations("UploadImageForm");

	const [state, action] = useActionState(uploadImageAction, createActionStateInitial());

	return (
		<Form action={action} className="grid gap-y-6" state={state}>
			<FormStatus state={state} />

			<label>
				<div>{t("input")}</div>
				<input accept="image/png, image/jpeg" name="file" required={true} type="file" />
			</label>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>

			<div>
				<FormSuccessMessage state={state} />
				<FormErrorMessage state={state} />
			</div>
		</Form>
	);
}
