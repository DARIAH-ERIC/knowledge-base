"use server";

import { getFormDataValues, HttpError, isErr, log } from "@acdh-oeaw/lib";
import { getTranslations } from "next-intl/server";
import * as v from "valibot";

import { SubscribeNewsletterInputSchema } from "@/app/(app)/[locale]/(default)/_lib/subscribe-newsletter.schema";
import { client } from "@/lib/mailchimp/client";
import {
	type ActionState,
	createActionStateError,
	createActionStateSuccess,
	createServerAction,
	type GetValidationErrors,
} from "@/lib/server/actions";
import { globalPOSTRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

export const subscribeNewsletterAction = createServerAction<
	unknown,
	GetValidationErrors<typeof SubscribeNewsletterInputSchema>
>(async function subscribeNewsletterAction(
	previousActionState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const e = await getTranslations("errors");

	try {
		if (!(await globalPOSTRateLimit())) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const t = await getTranslations("actions.subscribeNewsletterAction");

		const validation = await v.safeParseAsync(
			SubscribeNewsletterInputSchema,
			getFormDataValues(formData),
		);

		if (!validation.success) {
			const errors = v.flatten<typeof SubscribeNewsletterInputSchema>(validation.issues);

			return createActionStateError({
				message: errors.root ?? e("invalid-form-fields"),
				validationErrors: errors.nested,
			});
		}

		const { email, firstName, institution, lastName } = validation.output;

		const result = await client.subscribe({ email, firstName, institution, lastName });

		if (isErr(result)) {
			if (HttpError.is(result.error) && result.error.response.status === 214) {
				return createActionStateError({ message: t("already-subscribed") });
			}

			return createActionStateError({ message: t("error") });
		}

		return createActionStateSuccess({ message: t("success") });
	} catch (error) {
		log.error(error);

		return createActionStateError({ message: e("internal-server-error") });
	}
});
