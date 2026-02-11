import { urls } from "@/config/auth.config";
import type { AuthenticatedSession, SessionValidationResult } from "@/lib/data/users";
import type { IntlLocale } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";

export function assertAuthenticatedSession(
	params: SessionValidationResult,
	locale: IntlLocale,
): asserts params is AuthenticatedSession {
	const { session, user } = params;

	if (session == null) {
		redirect({ href: urls.signIn, locale });
	}

	if (!user.isEmailVerified) {
		redirect({ href: urls.verifyEmail, locale });
	}

	if (!user.isTwoFactorRegistered) {
		redirect({ href: urls["2faSetup"], locale });
	}

	if (!session.isTwoFactorVerified) {
		redirect({ href: urls["2fa"], locale });
	}
}
