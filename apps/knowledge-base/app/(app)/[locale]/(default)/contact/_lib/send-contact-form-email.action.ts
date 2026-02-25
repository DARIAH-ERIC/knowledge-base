"use server";

import { getFormDataValues, log } from "@acdh-oeaw/lib";
import {
	type ActionState,
	createActionStateError,
	createActionStateSuccess,
	type GetValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { SendContactFormInputSchema } from "@/app/(app)/[locale]/(default)/contact/_lib/send-contact-form-email.schema";
import { env } from "@/config/env.config";
import { email as emailService } from "@/lib/email";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const sendContactFormEmailAction = createServerAction<
	unknown,
	GetValidationErrors<typeof SendContactFormInputSchema>
>(async function sendContactFormEmailAction(
	state: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const e = await getTranslations("errors");

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

	const result = await emailService.sendEmail({
		from: `${name} <${email}>`,
		to: env.EMAIL_ADDRESS,
		subject,
		text: message,
	});

	if (result.isErr()) {
		return createActionStateError({
			formData,
			message: t("error"),
		});
	}

	log.info(result.value);

	return createActionStateSuccess({ message: t("success") });
});
