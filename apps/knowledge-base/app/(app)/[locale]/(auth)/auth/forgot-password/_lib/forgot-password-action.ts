"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { type ActionState, createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { RefillingTokenBucket } from "@dariah-eric/rate-limiter";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { auth } from "@/lib/auth";
import { redirect } from "@/lib/navigation/navigation";

const passwordResetEmailIPBucket = new RefillingTokenBucket<string>(3, 60);
const passwordResetEmailUserBucket = new RefillingTokenBucket<string>(3, 60);

const ForgotPasswordActionInputSchema = v.object({
	email: v.pipe(v.string(), v.email()),
});

export async function forgotPasswordAction(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.forgotPasswordAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRequestRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const ip = (await headers()).get("X-Forwarded-For");
	if (ip != null && !passwordResetEmailIPBucket.check(ip, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const result = await v.safeParseAsync(
		ForgotPasswordActionInputSchema,
		getFormDataValues(formData),
	);

	if (!result.success) {
		const errors = v.flatten<typeof ForgotPasswordActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { email } = result.output;

	const user = await auth.getUserByEmail(email);
	if (user == null) {
		return createActionStateError({ message: t("invalid-account") });
	}

	if (ip != null && !passwordResetEmailIPBucket.consume(ip, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}
	if (!passwordResetEmailUserBucket.consume(user.id, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const session = await auth.createPasswordResetSession(user.id, user.email);

	await auth.sendPasswordResetEmail(session.email, session.code);
	await auth.setPasswordResetSessionCookie(session.token, session.expiresAt);

	redirect({ href: "/auth/reset-password/verify-email", locale });
}
