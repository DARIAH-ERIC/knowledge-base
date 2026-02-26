"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import {
	SetupTwoFactorActionInputSchema,
	TotpKeySchema,
} from "@/app/(app)/[locale]/(auth)/auth/two-factor/setup/_lib/setup-two-factor.schema";
import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const setupTwoFactorAction = createServerAction(
	async function setupTwoFactorAction(state, formData) {
		const locale = await getLocale();
		const t = await getTranslations("actions.setupTwoFactorAction");
		const e = await getTranslations("errors");

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const { session, user } = await getCurrentSession();

		if (session == null) {
			return createActionStateError({ message: e("not-authenticated") });
		}
		if (!user.isEmailVerified) {
			return createActionStateError({ message: e("forbidden") });
		}
		if (user.isTwoFactorRegistered && !session.isTwoFactorVerified) {
			return createActionStateError({ message: e("forbidden") });
		}
		if (!auth.totpUpdateBucket.check(user.id, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}

		const result = await v.safeParseAsync(
			SetupTwoFactorActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof SetupTwoFactorActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? e("invalid-form-fields"),
				validationErrors: errors.nested,
			});
		}

		const { code, key: encryptedKey } = result.output;

		const keyResult = await v.safeParseAsync(TotpKeySchema, encryptedKey, {
			lang: getIntlLanguage(locale),
		});

		if (!keyResult.success) {
			return createActionStateError({ message: t("invalid-key") });
		}

		const key = keyResult.output;

		if (!auth.totpUpdateBucket.consume(user.id, 1)) {
			return createActionStateError({ message: e("too-many-requests") });
		}
		if (!auth.verifyTotp(key, code)) {
			return createActionStateError({ message: t("invalid-code") });
		}

		await auth.updateUserTotpKey(user.id, key);
		await auth.setSessionAsTwoFactorVerified(session.id);

		redirect({ href: "/auth/recovery-code", locale });
	},
);
