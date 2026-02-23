"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { FieldError, Input, Label, TextField } from "react-aria-components";

import { updatePasswordAction } from "@/app/(app)/[locale]/(auth)/auth/settings/_actions/update-password-action";
import { Form } from "@/components/form";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";

export function UpdatePasswordForm(): ReactNode {
	const t = useTranslations("UpdatePasswordForm");

	const [state, action] = useActionState(updatePasswordAction, createActionStateInitial());

	return (
		<Form action={action} state={state}>
			<FormStatus state={state} />

			{/* <Honeypot /> */}

			<TextField autoComplete="current-password" isRequired={true} name="password" type="password">
				<Label>{t("current-password")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField autoComplete="new-password" isRequired={true} name="new-password" type="password">
				<Label>{t("new-password")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField
				autoComplete="new-password"
				isRequired={true}
				name="new-password-confirmation"
				type="password"
			>
				<Label>{t("confirm-new-password")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<div>
				<SubmitButton>{t("submit")}</SubmitButton>
			</div>
		</Form>
	);
}
