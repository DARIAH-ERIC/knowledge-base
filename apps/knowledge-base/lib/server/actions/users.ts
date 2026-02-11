"use server";

import { getLocale, getTranslations } from "next-intl/server";

import { urls } from "@/config/auth.config";
import { deleteSessionTokenCookie, getCurrentSession, invalidateSession } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { type ActionState, createActionStateError } from "@/lib/server/actions";
import { globalPostRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

export async function signOutAction(): Promise<ActionState> {
	const locale = await getLocale();
	const e = await getTranslations("errors");

	if (!(await globalPostRateLimit())) {
		return createActionStateError({ message: e("too-many-requests") });
	}

	const { session } = await getCurrentSession();

	if (session == null) {
		return createActionStateError({ message: e("not-authenticated") });
	}

	await invalidateSession(session.id);
	await deleteSessionTokenCookie();

	redirect({ href: urls.signIn, locale });
}
