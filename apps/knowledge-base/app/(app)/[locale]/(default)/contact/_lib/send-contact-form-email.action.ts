"use server";

import { getFormDataValues, isErr, log } from "@acdh-oeaw/lib";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { SendContactFormInputSchema } from "@/app/(app)/[locale]/(default)/contact/_lib/send-contact-form-email.schema";
import { env } from "@/config/env.config";
import { getIntlLanguage } from "@/lib/i18n/locales";
import {
	type ActionState,
	createActionStateError,
	createActionStateSuccess,
	type GetValidationErrors,
} from "@/lib/server/actions";
import { createServerAction } from "@/lib/server/actions/create-server-action";
import { sendEmail } from "@/lib/server/email/send-email";
// import { assertValidFormSubmission } from "@/lib/server/honeypot";

export const sendContactFormEmailAction = createServerAction<
	unknown,
	GetValidationErrors<typeof SendContactFormInputSchema>
>(async function sendContactFormEmailAction(
	state: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const e = await getTranslations("errors");

	// assertValidFormSubmission(formData);
	// if (isHoneypotError(error)) {
	// 	return createActionStateError({ message: e("invalid-form-fields"), formData });
	// }

	const locale = await getLocale();
	const t = await getTranslations("actions.sendContactFormEmailAction");

	const validation = await v.safeParseAsync(
		SendContactFormInputSchema,
		getFormDataValues(formData),
		{ lang: getIntlLanguage(locale) },
	);

	if (!validation.success) {
		const errors = v.flatten<typeof SendContactFormInputSchema>(validation.issues);

		return createActionStateError({
			formData,
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { email, message, name, subject } = validation.output;

	const result = await sendEmail({
		from: `${name} <${email}>`,
		to: env.EMAIL_ADDRESS,
		subject,
		text: message,
	});

	if (isErr(result)) {
		return createActionStateError({
			formData,
			message: t("error"),
		});
	}

	log.info(result.value);

	return createActionStateSuccess({ message: t("success") });
});
