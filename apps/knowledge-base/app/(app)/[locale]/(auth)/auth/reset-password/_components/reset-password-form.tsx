"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { resetPasswordAction } from "@/app/(app)/[locale]/(auth)/auth/reset-password/_lib/reset-password.action";
import { Form } from "@/components/form";
import { FieldError, Label } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";

export function ResetPasswordForm(): ReactNode {
	const t = useTranslations("ResetPasswordForm");

	const [state, action] = useActionState(resetPasswordAction, createActionStateInitial());

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
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

			<SubmitButton className="mt-2">{t("submit")}</SubmitButton>
		</Form>
	);
}
