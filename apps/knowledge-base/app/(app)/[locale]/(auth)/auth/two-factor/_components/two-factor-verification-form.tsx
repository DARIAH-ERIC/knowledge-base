"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { verifyTwoFactorAction } from "@/app/(app)/[locale]/(auth)/auth/two-factor/_lib/verify-two-factor.action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function TwoFactorVerificationForm(): ReactNode {
	const t = useTranslations("TwoFactorVerificationForm");

	const [state, action] = useActionState(verifyTwoFactorAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			<TextField autoComplete="one-time-code" autoFocus={true} isRequired={true} name="code">
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
