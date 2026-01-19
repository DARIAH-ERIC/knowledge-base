"use server";

import { getFormDataValues, log } from "@acdh-oeaw/lib";
import { unstable_rethrow as rethrow } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { SendContactFormInputSchema } from "@/app/(app)/[locale]/(default)/contact/_lib/send-contact-form-email.schema";
import { env } from "@/config/env.config";
import { getIntlLanguage } from "@/lib/i18n/locales";
import {
	type ActionState,
	createActionStateError,
	createActionStateSuccess,
	createServerAction,
	type GetValidationErrors,
} from "@/lib/server/actions";
import { sendEmail } from "@/lib/server/email/send-email";
// import { assertValidFormSubmission } from "@/lib/server/honeypot";
import { globalPOSTRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

export const sendContactFormEmailAction = createServerAction<
	unknown,
	GetValidationErrors<typeof SendContactFormInputSchema>
>(async function sendContactFormEmailAction(
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

		const { email, message, subject } = validation.output;

		const info = await sendEmail({
			from: email,
			to: env.EMAIL_ADDRESS,
			subject,
			text: message,
		});

		log.info(info);

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
