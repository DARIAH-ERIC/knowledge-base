"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { verifyPasswordHash } from "@dariah-eric/auth";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import { urls } from "@/config/auth.config";
import {
	createSession,
	generateSessionToken,
	getUserFromEmail,
	getUserPasswordHash,
	setSessionTokenCookie,
} from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { type ActionState, createActionStateError } from "@/lib/server/actions";
import { globalPostRateLimit } from "@/lib/server/rate-limit/global-rate-limit";
import { RefillingTokenBucket, Throttler } from "@/lib/server/rate-limit/rate-limiter";

const throttler = new Throttler<string>([1, 2, 4, 8, 16, 30, 60, 180, 300]);
const ipBucket = new RefillingTokenBucket<string>(20, 1);

const SignInActionInputSchema = v.object({
	email: v.pipe(v.string(), v.email()),
	password: v.pipe(v.string(), v.nonEmpty()),
});

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.signInAction");
	const e = await getTranslations("errors");

	if (!(await globalPostRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	/**
	 * Assumes `x-forwarded-for` header will always be defined.
	 *
	 * In acdh infrastructure, `x-forwarded-for` actually holds the ip of the `nginx` ingress.
	 * Ask a sysadmin to enable "proxy-protocol" in `haproxy` to receive actual ip addresses.
	 */
	const clientIP = (await headers()).get("X-Forwarded-For");
	if (clientIP != null && !ipBucket.check(clientIP, 1)) {
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

	const user = await getUserFromEmail(email);
	if (user == null) {
		return createActionStateError({ message: t("invalid-account") });
	}

	if (clientIP != null && !ipBucket.consume(clientIP, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}
	if (!throttler.consume(user.id)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const passwordHash = await getUserPasswordHash(user.id);
	const validPassword = await verifyPasswordHash(passwordHash, password);
	if (!validPassword) {
		return createActionStateError({ message: t("incorrect-password") });
	}

	throttler.reset(user.id);

	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id, { isTwoFactorVerified: false });
	await setSessionTokenCookie(sessionToken, session.expiresAt);

	if (!user.isEmailVerified) {
		redirect({ href: urls.verifyEmail, locale });
	}

	if (!user.isTwoFactorRegistered) {
		redirect({ href: urls["2faSetup"], locale });
	}

	redirect({ href: urls["2fa"], locale });
}
