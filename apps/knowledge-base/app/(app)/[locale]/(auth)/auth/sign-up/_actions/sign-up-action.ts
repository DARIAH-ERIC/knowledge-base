"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { verifyPasswordStrength } from "@dariah-eric/auth";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import * as v from "valibot";

import {
	passwordMaxLength,
	passwordMinLength,
	urls,
	usernameMaxLength,
	usernameMinLength,
} from "@/config/auth.config";
import { env } from "@/config/env.config";
import {
	createEmailVerificationRequest,
	createSession,
	createUser,
	generateSessionToken,
	isUserEmailAvailable,
	sendVerificationEmail,
	setEmailVerificationRequestCookie,
	setSessionTokenCookie,
} from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { type ActionState, createActionStateError } from "@/lib/server/actions";
import { globalPostRateLimit } from "@/lib/server/rate-limit/global-rate-limit";
import { RefillingTokenBucket } from "@/lib/server/rate-limit/rate-limiter";

const ipBucket = new RefillingTokenBucket<string>(3, 10);

const SignUpActionInputSchema = v.pipe(
	v.object({
		email: v.pipe(v.string(), v.email(), v.toLowerCase()),
		username: v.pipe(v.string(), v.minLength(usernameMinLength), v.maxLength(usernameMaxLength)),
		password: v.pipe(v.string(), v.minLength(passwordMinLength), v.maxLength(passwordMaxLength)),
		"password-confirmation": v.pipe(v.string(), v.nonEmpty()),
	}),
	v.forward(
		v.partialCheck(
			[["password"], ["password-confirmation"]],
			(input) => {
				return input["password-confirmation"] === input.password;
			},
			"Passwords don't match.",
		),
		["password-confirmation"],
	),
);

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
	const locale = await getLocale();
	const t = await getTranslations("actions.signUpAction");
	const e = await getTranslations("errors");

	if (env.APP_AUTH_SIGN_UP !== "enabled") {
		return createActionStateError({ message: t("sign-up-disabled") });
	}

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

	const result = await v.safeParseAsync(SignUpActionInputSchema, getFormDataValues(formData));

	if (!result.success) {
		const errors = v.flatten<typeof SignUpActionInputSchema>(result.issues);

		return createActionStateError({
			message: errors.root ?? e("invalid-form-fields"),
			validationErrors: errors.nested,
		});
	}

	const { email, password, username } = result.output;

	const emailAvailable = await isUserEmailAvailable(email);
	if (!emailAvailable) {
		return createActionStateError({ message: t("email-in-use") });
	}

	const strongPassword = await verifyPasswordStrength(password);
	if (!strongPassword) {
		return createActionStateError({ message: t("weak-password") });
	}

	if (clientIP != null && !ipBucket.consume(clientIP, 1)) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const user = await createUser({ email, username, password });
	const emailVerificationRequest = await createEmailVerificationRequest(user.id, user.email);
	await sendVerificationEmail(emailVerificationRequest.email, emailVerificationRequest.code);
	await setEmailVerificationRequestCookie(emailVerificationRequest);

	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id, { isTwoFactorVerified: false });
	await setSessionTokenCookie(sessionToken, session.expiresAt);

	redirect({ href: urls["2faSetup"], locale });
}
