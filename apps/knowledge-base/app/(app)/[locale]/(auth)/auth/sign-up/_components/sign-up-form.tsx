"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { signUpAction } from "@/app/(app)/[locale]/(auth)/auth/sign-up/_lib/sign-up.action";
import { Form } from "@/components/form";
import { FieldError, Label } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";

export function SignUpForm(): ReactNode {
	const t = useTranslations("SignUpForm");

	const [state, action] = useActionState(signUpAction, createActionStateInitial());

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormStatus state={state} />

			<TextField autoComplete="name" isRequired={true} name="name">
				<Label>{t("name")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField autoComplete="email" isRequired={true} name="email" type="email">
				<Label>{t("email")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField autoComplete="new-password" isRequired={true} name="password" type="password">
				<Label>{t("password")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField
				autoComplete="new-password"
				isRequired={true}
				name="password-confirmation"
				type="password"
			>
				<Label>{t("confirm-password")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<SubmitButton className="mt-2">{t("submit")}</SubmitButton>
		</Form>
	);
}
