"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { signInAction } from "@/app/(app)/[locale]/(auth)/auth/sign-in/_actions/sign-in.action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function SignInForm(): ReactNode {
	const t = useTranslations("SignInForm");

	const [state, action] = useActionState(signInAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			<TextField autoComplete="email" isRequired={true} name="email" type="email">
				<Label>{t("email")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField autoComplete="current-password" isRequired={true} name="password" type="password">
				<Label>{t("password")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
