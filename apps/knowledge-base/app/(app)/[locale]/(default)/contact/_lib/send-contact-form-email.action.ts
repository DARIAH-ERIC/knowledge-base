"use server";

import { getFormDataValues, log } from "@acdh-oeaw/lib";
import {
	type GetValidationErrors,
	createActionStateError,
	createActionStateSuccess,
} from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { SendContactFormInputSchema } from "@/app/(app)/[locale]/(default)/contact/_lib/send-contact-form-email.schema";
import { env } from "@/config/env.config";
import { email as emailService } from "@/lib/email";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const sendContactFormEmailAction = createServerAction<
	unknown,
	GetValidationErrors<typeof SendContactFormInputSchema>
>(async function sendContactFormEmailAction(state, formData) {
	const locale = await getLocale();
	const t = await getExtracted();

	const validation = await v.safeParseAsync(
		SendContactFormInputSchema,
		getFormDataValues(formData),
		{ lang: getIntlLanguage(locale) },
	);

	if (!validation.success) {
		const errors = v.flatten<typeof SendContactFormInputSchema>(validation.issues);

		return createActionStateError({
			message: errors.root ?? t("Invalid or missing fields."),
			validationErrors: errors.nested,
		});
	}

	const { email, message, name, subject } = validation.output;

	/**
	 * The sender's address goes into `reply-to`, never into `from`: the smtp server only sends for
	 * its own domains, and a `from` address of a foreign domain fails spf/dmarc checks at the
	 * recipient's mail server, which then quarantines or rejects it. The sender's name is the display
	 * name of `from` instead, so that the inbox lists the message by who wrote it, and replying
	 * answers them.
	 */
	const result = await emailService.sendEmail({
		from: { name: `${name} (via DARIAH knowledge base)`, address: env.EMAIL_ADDRESS },
		replyTo: { name, address: email },
		to: env.EMAIL_ADDRESS,
		subject,
		text: message,
	});

	if (result.isErr()) {
		return createActionStateError({
			message: t("Failed to send message."),
		});
	}

	log.info(result.value);

	return createActionStateSuccess({ message: t("Successfully sent message.") });
});
