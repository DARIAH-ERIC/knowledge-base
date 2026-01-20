"use server";

import { getFormDataValues, HttpError, isErr, log } from "@acdh-oeaw/lib";
import { unstable_rethrow as rethrow } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { SubscribeNewsletterInputSchema } from "@/app/(app)/[locale]/(default)/_lib/subscribe-newsletter.schema";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { client } from "@/lib/mailchimp/client";
import {
	type ActionState,
	createActionStateError,
	createActionStateSuccess,
	createServerAction,
	type GetValidationErrors,
} from "@/lib/server/actions";
// import { assertValidFormSubmission } from "@/lib/server/honeypot";
import { globalPOSTRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

export const subscribeNewsletterAction = createServerAction<
	unknown,
	GetValidationErrors<typeof SubscribeNewsletterInputSchema>
>(async function subscribeNewsletterAction(
	state: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const e = await getTranslations("errors");

	try {
		if (!(await globalPOSTRateLimit())) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		// assertValidFormSubmission(formData);
		// if (isHoneypotError(error)) {
		// 	return createActionStateError({ message: e("invalid-form-fields"), formData });
		// }

		const locale = await getLocale();
		const t = await getTranslations("actions.subscribeNewsletterAction");

		const validation = await v.safeParseAsync(
			SubscribeNewsletterInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!validation.success) {
			const errors = v.flatten<typeof SubscribeNewsletterInputSchema>(validation.issues);

			return createActionStateError({
				formData,
				message: errors.root ?? e("invalid-form-fields"),
				validationErrors: errors.nested,
			});
		}

		const { email } = validation.output;

		const result = await client.subscribe({ email });

		if (isErr(result)) {
			if (HttpError.is(result.error) && result.error.response.status === 214) {
				return createActionStateError({
					formData,
					message: t("already-subscribed"),
				});
			}

			return createActionStateError({
				formData,
				message: t("error"),
			});
		}

		// TODO: log mailchimp success message

		return createActionStateSuccess({ message: t("success") });
	} catch (error) {
		rethrow(error);

		log.error(error);

		return createActionStateError({
			formData,
			message: e("internal-server-error"),
		});
	}
});
