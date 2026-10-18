import { log } from "@acdh-oeaw/lib";

import { auth } from "@/lib/auth";
import type { Transaction } from "@/lib/db";
import type { IntlLocale } from "@/lib/i18n/locales";
import { createFullUrl } from "@/lib/navigation/create-full-url";
import { getPathname } from "@/lib/navigation/navigation";
import { UserFacingError } from "@/lib/user-facing-error";

/**
 * Creates a fresh invitation for the user and emails them the link, replacing any earlier one.
 *
 * Runs inside the caller's transaction and throws when the email cannot be sent, so a failed send
 * rolls back the invitation (and, when creating, the account) instead of leaving behind a user who
 * never heard about it.
 */
export async function sendUserInvitation(
	tx: Transaction,
	user: { id: string; email: string; name: string },
	locale: IntlLocale,
): Promise<void> {
	const { token } = await auth.createUserInvitation(user.id, user.email, tx);

	const url = createFullUrl({
		pathname: getPathname({ href: "/auth/accept-invitation", locale }),
		searchParams: { token },
	});

	const result = await auth.sendInvitationEmail({
		to: user.email,
		name: user.name,
		url: String(url),
	});

	if (result.isErr()) {
		log.error("Failed to send invitation email.", result.error);
		throw new UserFacingError("invitation-email-not-sent");
	}
}
