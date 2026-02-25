"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { resetTwoFactorAction } from "@/app/(app)/[locale]/(auth)/auth/two-factor/reset/_lib/reset-two-factor.action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function TwoFactorResetForm(): ReactNode {
	const t = useTranslations("TwoFactorResetForm");

	const [state, action] = useActionState(resetTwoFactorAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			<TextField isRequired={true} name="code">
				<Label>{t("recovery-code")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
