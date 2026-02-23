"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { verifyPasswordReset2faWithTOTPAction } from "@/app/(app)/[locale]/(auth)/auth/reset-password/2fa/_lib/verify-password-reset-2fa-with-totp-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function PasswordResetTOTPFormContent(): ReactNode {
	const t = useTranslations("PasswordResetTOTPForm");

	const [state, action] = useActionState(
		verifyPasswordReset2faWithTOTPAction,
		createActionStateInitial(),
	);

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<TextField isRequired={true} name="code">
				<Label>{t("code")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
