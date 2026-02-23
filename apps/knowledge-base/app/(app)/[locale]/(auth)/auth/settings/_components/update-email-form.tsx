"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { updateEmailAction } from "@/app/(app)/[locale]/(auth)/auth/settings/_actions/update-email-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function UpdateEmailForm(): ReactNode {
	const t = useTranslations("UpdateEmailForm");

	const [state, action] = useActionState(updateEmailAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			<TextField autoComplete="email" isRequired={true} name="email" type="email">
				<Label>{t("new-email")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
