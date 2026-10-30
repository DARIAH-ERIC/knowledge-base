"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form, getResetKeyOnError } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { SubmitButton } from "@dariah-eric/ui/submit-button";
import { TextField } from "@dariah-eric/ui/text-field";
import { useExtracted } from "next-intl";
import { type ReactNode, useActionState } from "react";

import { updatePasswordAction } from "@/app/(app)/[locale]/(auth)/auth/settings/_lib/update-password.action";

export function UpdatePasswordForm(): ReactNode {
	const t = useExtracted();

	const [state, action] = useActionState(updatePasswordAction, createActionStateInitial());
	/** Password fields are emptied after a failed submission. */
	const passwordKey = getResetKeyOnError(state);

	return (
		<Form action={action} className="flex flex-col gap-y-6" resetOnSuccess={true} state={state}>
			<FormStatus state={state} />

			<TextField
				key={`password-${passwordKey}`}
				autoComplete="current-password"
				isRequired={true}
				name="password"
				type="password"
			>
				<Label>{t("Current password")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField
				key={`new-password-${passwordKey}`}
				autoComplete="new-password"
				isRequired={true}
				name="new-password"
				type="password"
			>
				<Label>{t("New password")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<TextField
				key={`new-password-confirmation-${passwordKey}`}
				autoComplete="new-password"
				isRequired={true}
				name="new-password-confirmation"
				type="password"
			>
				<Label>{t("Confirm new password")}</Label>
				<FieldError />
				<Input />
			</TextField>

			<SubmitButton className="mbs-2">{t("Update")}</SubmitButton>
		</Form>
	);
}
