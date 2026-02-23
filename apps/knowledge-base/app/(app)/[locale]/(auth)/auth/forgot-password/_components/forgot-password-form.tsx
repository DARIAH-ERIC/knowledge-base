"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { forgotPasswordAction } from "@/app/(app)/[locale]/(auth)/auth/forgot-password/_lib/forgot-password-action";
import { Form } from "@/components/form";
import { FormErrorMessage } from "@/components/form-error-message";
import { FormSuccessMessage } from "@/components/form-success-message";
import { SubmitButton } from "@/components/submit-button";

export function ForgotPasswordForm(): ReactNode {
	const t = useTranslations("ForgotPasswordForm");

	const [state, action] = useActionState(forgotPasswordAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormErrorMessage state={state} />
			<FormSuccessMessage state={state} />

			<TextField autoComplete="email" isRequired={true} name="email" type="email">
				<Label>{t("email")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
