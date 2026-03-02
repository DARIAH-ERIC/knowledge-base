"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { verifyEmailAction } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_lib/verify-email.action";
import { Form } from "@/components/form";
import { FieldError, Label } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";

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
