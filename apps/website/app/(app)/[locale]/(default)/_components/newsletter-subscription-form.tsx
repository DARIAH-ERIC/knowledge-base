"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { subscribeNewsletterAction } from "@/app/(app)/[locale]/(default)/_lib/actions/subscribe-newsletter-action";
import { createInitialActionState } from "@/lib/server/actions";

export function NewsletterSubscriptionForm(): ReactNode {
	const t = useTranslations("NewsletterSubscriptionForm");

	const [_formState, formAction] = useActionState(
		subscribeNewsletterAction,
		createInitialActionState({}),
	);

	return (
		<form action={formAction}>
			<label>
				<div>{t("first-name")}</div>
				<input name="firstName" required={true} />
			</label>

			<label>
				<div>{t("last-name")}</div>
				<input name="lastName" required={true} />
			</label>

			<label>
				<div>{t("email")}</div>
				<input name="email" required={true} type="email" />
			</label>

			<label>
				<div>{t("institution")}</div>
				<input name="institution" />
			</label>

			<button type="submit">{t("submit")}</button>
		</form>
	);
}
