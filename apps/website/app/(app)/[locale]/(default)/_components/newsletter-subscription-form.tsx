"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { subscribeNewsletterAction } from "@/app/(app)/[locale]/(default)/_lib/subscribe-newsletter.action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { createActionStateInitial } from "@/lib/server/actions";

export function NewsletterSubscriptionForm(): ReactNode {
	const t = useTranslations("NewsletterSubscriptionForm");

	const [state, action] = useActionState(subscribeNewsletterAction, createActionStateInitial());

	return (
		<Form action={action} className="grid gap-y-6" state={state}>
			<FormStatus state={state} />


			<label>
				<div>{t("email")}</div>
				<input name="email" required={true} type="email" />
			</label>



			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
