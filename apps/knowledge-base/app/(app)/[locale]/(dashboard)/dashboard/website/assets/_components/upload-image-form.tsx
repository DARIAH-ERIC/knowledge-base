"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { SubmitButton } from "@dariah-eric/ui/submit-button";
import { useExtracted } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { uploadImageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/upload-image.action";

/**
 * TODO: use getPresignedUploadUrl to upload directly from the client to the object store, and then
 * call a server action to create a record in the assets table for that object key.
 */

export function UploadImageForm(): ReactNode {
	const t = useExtracted();

	const [state, action] = useActionState(uploadImageAction, createActionStateInitial());

	return (
		<Form action={action} className="grid gap-y-6" state={state}>
			<FormStatus state={state} />

			<label>
				<div>{t("Select an image to upload")}</div>
				<input accept="image/png, image/jpeg" name="file" required={true} type="file" />
			</label>

			<div>
				<SubmitButton>{t("Upload image")}</SubmitButton>
			</div>
		</Form>
	);
}
