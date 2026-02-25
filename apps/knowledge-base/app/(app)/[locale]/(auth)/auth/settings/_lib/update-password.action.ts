"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import {
	type ActionState,
	createActionStateError,
	createActionStateSuccess,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getTranslations } from "next-intl/server";
import * as v from "valibot";

import { UpdatePasswordActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/settings/_lib/update-password.schema";
import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";

export async function updatePasswordAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const t = await getTranslations("actions.updatePasswordAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRequestRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session, user } = await getCurrentSession();

	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}
	if (user.isTwoFactorRegistered && !session.isTwoFactorVerified) {
		return createActionStateError({ message: e("forbidden") });
	}
	if (!auth.passwordUpdateBucket.check(session.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const result = await v.safeParseAsync(
		UpdatePasswordActionInputSchema,
		getFormDataValues(formData),
	);

	if (!result.success) {
		const errors = v.flatten<typeof UpdatePasswordActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { password, "new-password": newPassword } = result.output;

	const isStrongPassword = await auth.verifyPasswordStrength(newPassword);
	if (!isStrongPassword) {
		return createActionStateError({ message: t("weak-password") });
	}

	if (!auth.passwordUpdateBucket.consume(session.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const passwordHash = await auth.getUserPasswordHash(user.id);
	const isValidPassword = await auth.verifyPasswordHash(passwordHash, password);
	if (!isValidPassword) {
		return createActionStateError({ message: t("incorrect-password") });
	}

	auth.passwordUpdateBucket.reset(session.id);

	await auth.deleteUserSessions(user.id);
	await auth.updatePassword(user.id, newPassword);

	const newSession = await auth.createSession(user.id, session.isTwoFactorVerified);
	await auth.setSessionCookie(newSession.token, newSession.expiresAt);

	return createActionStateSuccess({ message: t("password-updated") });
}
