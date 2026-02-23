"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { verifyPasswordResetEmailAction } from "@/app/(app)/[locale]/(auth)/auth/reset-password/verify-email/_lib/verify-password-reset-email-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function PasswordResetEmailVerificationForm(): ReactNode {
	const t = useTranslations("PasswordResetEmailVerificationForm");

	const [state, action] = useActionState(
		verifyPasswordResetEmailAction,
		createActionStateInitial(),
	);

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

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
