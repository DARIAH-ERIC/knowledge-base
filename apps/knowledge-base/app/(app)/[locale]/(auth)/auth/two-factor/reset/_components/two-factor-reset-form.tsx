"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { resetTwoFactorAction } from "@/app/(app)/[locale]/(auth)/auth/two-factor/reset/_lib/reset-two-factor.action";
import { Form } from "@/components/form";
import { FieldError, Label } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";

export function TwoFactorResetForm(): ReactNode {
	const t = useTranslations("TwoFactorResetForm");

	const [state, action] = useActionState(resetTwoFactorAction, createActionStateInitial());

	return (
		<Form action={action} className="flex flex-col gap-y-6" state={state}>
			<FormStatus state={state} />

			<TextField isRequired={true} name="code">
				<Label>{t("recovery-code")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<SubmitButton className="mt-2">{t("submit")}</SubmitButton>
		</Form>
	);
}
