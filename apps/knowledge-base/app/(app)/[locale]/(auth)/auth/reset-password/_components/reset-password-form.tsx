"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { resetPasswordAction } from "@/app/(app)/[locale]/(auth)/auth/reset-password/_lib/reset-password-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function ResetPasswordForm(): ReactNode {
	const t = useTranslations("ResetPasswordForm");

	const [state, action] = useActionState(resetPasswordAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

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
