"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { verifyTwoFactorAction } from "@/app/(app)/[locale]/(auth)/auth/two-factor/_lib/verify-two-factor.action";
import { Form } from "@/components/form";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { SubmitButton } from "@dariah-eric/ui/submit-button";
import { TextField } from "@dariah-eric/ui/text-field";

export function TwoFactorVerificationForm(): ReactNode {
	const t = useTranslations("TwoFactorVerificationForm");

	const [state, action] = useActionState(verifyTwoFactorAction, createActionStateInitial());

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormStatus state={state} />

			<TextField autoComplete="one-time-code" autoFocus={true} isRequired={true} name="code">
				<Label>{t("code")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<SubmitButton className="mt-2">{t("submit")}</SubmitButton>
		</Form>
	);
}
