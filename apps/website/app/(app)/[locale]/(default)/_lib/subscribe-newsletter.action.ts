"use server";

import { getFormDataValues, HttpError, isErr } from "@acdh-oeaw/lib";
import {
	createActionStateError,
	createActionStateSuccess,
	type GetValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { SubscribeNewsletterInputSchema } from "@/app/(app)/[locale]/(default)/_lib/subscribe-newsletter.schema";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { client } from "@/lib/mailchimp";
import { createServerAction } from "@/lib/server/create-server-action";

export const subscribeNewsletterAction = createServerAction<
	unknown,
	GetValidationErrors<typeof SubscribeNewsletterInputSchema>
>(async function subscribeNewsletterAction(state, formData) {
	const e = await getTranslations("errors");

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
		if (HttpError.is(result.error) && result.error.response.status === 400) {
			try {
				const message = (await result.error.response.json()) as { title?: string };

				if (message.title === "Member Exists") {
					return createActionStateError({
						formData,
						message: t("already-subscribed"),
					});
				}
			} catch {
				/** noop */
			}
		}

		return createActionStateError({
			formData,
			message: t("error"),
		});
	}

	return createActionStateSuccess({ message: t("success") });
});
