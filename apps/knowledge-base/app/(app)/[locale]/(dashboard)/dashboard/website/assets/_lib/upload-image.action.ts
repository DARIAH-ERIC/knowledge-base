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
import { ForbiddenError, RateLimitError } from "@/lib/server/errors";
import { globalPOSTRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

export const uploadImageAction = createServerAction<
	{ objectName: string },
	GetValidationErrors<typeof UploadImageInputSchema>
>(async function uploadImageAction(state, formData) {
	try {
		if (!(await globalPOSTRateLimit())) {
			throw new RateLimitError();
		}

		// FIXME:
		// const user = await assertAuthenticated()
		// await assertAuthorized(user)

		const t = await getTranslations("actions.uploadImageAction");

		const { file } = await v.parseAsync(UploadImageInputSchema, getFormDataValues(formData));

		const { objectName } = await uploadAsset({ file });

		revalidatePath("/dashboard/website/assets", "page");

		return createActionStateSuccess({ message: t("success"), data: { objectName } });
	} catch (error) {
		log.error(error);

		const e = await getTranslations("errors");

		if (error instanceof ForbiddenError) {
			return createActionStateError({ message: e("forbidden") });
		}

		if (error instanceof RateLimitError) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		if (v.isValiError<typeof UploadImageInputSchema>(error)) {
			const errors = v.flatten<typeof UploadImageInputSchema>(error.issues);

			return createActionStateError({
				message: errors.root ?? e("invalid-form-fields"),
				validationErrors: errors.nested,
			});
		}

		return createActionStateError({ message: e("internal-server-error") });
	}
});
