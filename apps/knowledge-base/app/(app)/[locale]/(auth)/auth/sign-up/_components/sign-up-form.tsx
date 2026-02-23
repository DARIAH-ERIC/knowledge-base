"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { signUpAction } from "@/app/(app)/[locale]/(auth)/auth/sign-up/_lib/sign-up.action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function SignUpForm(): ReactNode {
	const t = useTranslations("SignUpForm");

	const [state, action] = useActionState(signUpAction, createActionStateInitial());

	return (
		<Form action={action} className="grid gap-y-8" state={state}>
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

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
