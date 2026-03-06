"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { verifyPasswordResetEmailAction } from "@/app/(app)/[locale]/(auth)/auth/reset-password/verify-email/_lib/verify-password-reset-email.action";
import { Form } from "@/components/form";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { SubmitButton } from "@dariah-eric/ui/submit-button";
import { TextField } from "@dariah-eric/ui/text-field";

export function PasswordResetEmailVerificationForm(): ReactNode {
	const t = useTranslations("PasswordResetEmailVerificationForm");

	const [state, action] = useActionState(
		verifyPasswordResetEmailAction,
		createActionStateInitial(),
	);

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormStatus state={state} />

			<TextField isRequired={true} name="code">
				<Label>{t("code")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<SubmitButton className="mt-2">{t("submit")}</SubmitButton>
		</Form>
	);
}
