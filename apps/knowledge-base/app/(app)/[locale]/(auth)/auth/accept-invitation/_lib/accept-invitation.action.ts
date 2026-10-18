"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { AcceptInvitationActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/accept-invitation/_lib/accept-invitation.schema";
import { auth } from "@/lib/auth";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const acceptInvitationAction = createServerAction(
	async function acceptInvitationAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		const result = await v.safeParseAsync(
			AcceptInvitationActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof AcceptInvitationActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { token, password } = result.output;

		const isStrongPassword = await auth.verifyPasswordStrength(password);
		if (!isStrongPassword) {
			return createActionStateError({ message: t("Weak password.") });
		}

		const user = await auth.acceptUserInvitation(token, password);
		if (user == null) {
			return createActionStateError({
				message: t("This invitation link is invalid or has expired."),
			});
		}

		/** Whoever was signed in on this browser before is not the person who just accepted. */
		const { session: previousSession } = await auth.getCurrentSession();
		if (previousSession != null) {
			await auth.deleteSession(previousSession.id);
		}

		const session = await auth.createSession(user.id);
		await auth.setSessionCookie(session.token, session.expiresAt);

		redirect({ href: "/auth/two-factor/setup", locale });
	},
);
