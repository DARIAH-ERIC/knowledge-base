"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { type ActionState, createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { SignInActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/sign-in/_lib/sign-in.schema";
import { auth } from "@/lib/auth";
import { redirect } from "@/lib/navigation/navigation";

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.signInAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRequestRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const ip = (await headers()).get("x-forwarded-for");
	if (ip != null && !auth.signInIpBucket.check(ip, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const result = await v.safeParseAsync(SignInActionInputSchema, getFormDataValues(formData));

	if (!result.success) {
		const errors = v.flatten<typeof SignInActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { email, password } = result.output;

	const user = await auth.getUserByEmail(email);
	if (user == null) {
		return createActionStateError({ message: t("invalid-account") });
	}

	if (ip != null && !auth.signInIpBucket.consume(ip, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}
	if (!auth.signInTrottler.consume(user.id)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const passwordHash = await auth.getUserPasswordHash(user.id);
	const isValidPassword = await auth.verifyPasswordHash(passwordHash, password);
	if (!isValidPassword) {
		return createActionStateError({ message: t("incorrect-password") });
	}

	auth.signInTrottler.reset(user.id);

	const session = await auth.createSession(user.id);
	await auth.setSessionCookie(session.token, session.expiresAt);

	if (!user.isEmailVerified) {
		redirect({ href: "/auth/verify-email", locale });
	}

	if (!user.isTwoFactorRegistered) {
		redirect({ href: "/auth/two-factor/setup", locale });
	}

	redirect({ href: "/auth/two-factor", locale });
}
