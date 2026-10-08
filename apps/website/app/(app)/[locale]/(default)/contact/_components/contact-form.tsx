"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { Input, Label, TextArea, TextField } from "react-aria-components";

import { sendContactFormEmailAction } from "@/app/(app)/[locale]/(default)/contact/_lib/send-contact-form-email.action";
import { SubmitButton } from "@/components/submit-button";

export function ContactForm(): ReactNode {
	const t = useTranslations("ContactForm");

	const [state, action] = useActionState(sendContactFormEmailAction, createActionStateInitial());

	return (
		<Form action={action} className="flex flex-col gap-y-8" state={state}>
			<FormStatus state={state} />

			<TextField autoComplete="email" isRequired={true} name="email" type="email">
				<Label>{t("email")}</Label>
				<Input />
			</TextField>

			<TextField isRequired={true} name="name">
				<Label>{t("name")}</Label>
				<Input />
			</TextField>

			<TextField isRequired={true} name="subject">
				<Label>{t("subject")}</Label>
				<Input />
			</TextField>

			<TextField isRequired={true} name="message">
				<Label>{t("message")}</Label>
				<TextArea rows={5} />
			</TextField>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
