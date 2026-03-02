"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { VerifyPasswordResetEmailActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/reset-password/verify-email/_lib/verify-password-reset-email.schema";
import { auth } from "@/lib/auth";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const verifyPasswordResetEmailAction = createServerAction(
	async function verifyPasswordResetEmailAction(state, formData) {
		const locale = await getLocale();
		const t = await getTranslations("actions.verifyPasswordResetEmailAction");
		const e = await getTranslations("errors");

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const { session } = await auth.validatePasswordResetSessionFromRequest();

		if (session == null) {
			return createActionStateError({ message: e("not-authenticated") });
		}
		if (session.isEmailVerified) {
			return createActionStateError({ message: e("forbidden") });
		}
		if (!auth.emailVerificationBucket.check(session.userId, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const result = await v.safeParseAsync(
			VerifyPasswordResetEmailActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof VerifyPasswordResetEmailActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? e("invalid-form-fields"),
				validationErrors: errors.nested,
			});
		}

		const { code } = result.output;

		if (!auth.emailVerificationBucket.consume(session.userId, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}
		if (code !== session.code) {
			return createActionStateError({ message: t("incorrect-code") });
		}

		auth.emailVerificationBucket.reset(session.userId);
		await auth.setPasswordResetSessionAsEmailVerified(session.id);

		const emailMatches = await auth.setUserAsEmailVerifiedIfEmailMatches(
			session.userId,
			session.email,
		);
		if (!emailMatches) {
			return createActionStateError({ message: t("restart") });
		}

		redirect({ href: "/auth/reset-password/two-factor", locale });
	},
);
