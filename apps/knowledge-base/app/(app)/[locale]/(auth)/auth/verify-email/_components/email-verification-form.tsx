"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { SubmitButton } from "@dariah-eric/ui/submit-button";
import { TextField } from "@dariah-eric/ui/text-field";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { verifyEmailAction } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_lib/verify-email.action";

export function EmailVerificationForm(): ReactNode {
	const t = useTranslations("EmailVerificationForm");

	const [state, action] = useActionState(verifyEmailAction, createActionStateInitial());

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormStatus state={state} />

			<TextField isRequired={true} name="code">
				<Label>{t("code")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<SubmitButton className="mt-2">{t("verify")}</SubmitButton>
		</Form>
	);
}
