"use server";

import { getFormDataValues, log } from "@acdh-oeaw/lib";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import * as v from "valibot";

import { UploadImageInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/upload-image.schema";
import { uploadAsset } from "@/lib/data/assets";
import {
	createActionStateError,
	createActionStateSuccess,
	createServerAction,
	type GetValidationErrors,
} from "@/lib/server/actions";
import { globalPOSTRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

export const uploadImageAction = createServerAction<
	{ key: string },
	GetValidationErrors<typeof UploadImageInputSchema>
>(async function uploadImageAction(state, formData) {
	const e = await getTranslations("errors");

	try {
		if (!(await globalPOSTRateLimit())) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		// FIXME:
		// const user = await assertAuthenticated()
		// await assertAuthorized(user)

		const t = await getTranslations("actions.uploadImageAction");

		const validation = await v.safeParseAsync(UploadImageInputSchema, getFormDataValues(formData));

		if (!validation.success) {
			const errors = v.flatten<typeof UploadImageInputSchema>(validation.issues);

			return createActionStateError({
				message: errors.root ?? e("invalid-form-fields"),
				validationErrors: errors.nested,
			});
		}

		const { file, licenseId, prefix } = validation.output;

		const { key } = await uploadAsset({ file, licenseId, prefix });

		revalidatePath("/dashboard/website/assets", "page");

		return createActionStateSuccess({ message: t("success"), data: { key } });
	} catch (error) {
		log.error(error);

		return createActionStateError({ message: e("internal-server-error") });
	}
});
