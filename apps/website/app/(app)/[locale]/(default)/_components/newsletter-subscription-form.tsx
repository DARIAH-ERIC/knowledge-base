"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { Input, Label, TextField } from "react-aria-components";

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

			{/* <HoneypotField /> */}

			<TextField
				autoComplete="email"
				defaultValue={(state.formData?.get("email") ?? "") as string}
				isRequired={true}
				name="email"
				type="email"
			>
				<Label>{t("email")}</Label>
				<Input />
			</TextField>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
