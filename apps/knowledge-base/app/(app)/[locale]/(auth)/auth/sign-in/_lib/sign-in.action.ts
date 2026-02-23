"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { type ActionState, createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { RefillingTokenBucket, Throttler } from "@dariah-eric/rate-limiter";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { SignInActionInputSchema } from "@/app/(app)/[locale]/(auth)/auth/sign-in/_lib/sign-in.schema";
import { auth } from "@/lib/auth";
import { redirect } from "@/lib/navigation/navigation";

const throttler = new Throttler<string>([1, 2, 4, 8, 16, 30, 60, 180, 300]);
const ipBucket = new RefillingTokenBucket<string>(20, 1);

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.signInAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRequestRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const ip = (await headers()).get("x-forwarded-for");
	if (ip != null && !ipBucket.check(ip, 1)) {
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

	if (ip != null && !ipBucket.consume(ip, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}
	if (!throttler.consume(user.id)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const passwordHash = await auth.getUserPasswordHash(user.id);
	const isValidPassword = await auth.verifyPasswordHash(passwordHash, password);
	if (!isValidPassword) {
		return createActionStateError({ message: t("incorrect-password") });
	}

	throttler.reset(user.id);

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
