"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { verifyEmailAction } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_lib/verify-email.action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function EmailVerificationForm(): ReactNode {
	const t = useTranslations("EmailVerificationForm");

	const [state, action] = useActionState(verifyEmailAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			<TextField isRequired={true} name="code">
				<Label>{t("code")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{t("verify")}</SubmitButton>
			</div>
		</Form>
	);
}
