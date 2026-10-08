"use client";

import {
	type ActionState,
	type ValidationErrors,
	isActionStateError,
	isActionStateSuccess,
} from "@dariah-eric/next-lib/actions";
import { type ReactNode, startTransition, useLayoutEffect, useRef } from "react";
import { Form as AriaForm, type FormProps as AriaFormProps } from "react-aria-components";

export interface FormProps<
	TData = unknown,
	TValidationErrors extends object = ValidationErrors,
> extends AriaFormProps {
	children: ReactNode;
	state: ActionState<TData, TValidationErrors>;
}

/**
 * React resets a form once its `action` has run, whatever the result, which would discard the
 * user's input whenever the server rejects it. So submissions are dispatched from `onSubmit`
 * instead, which React does not follow with a reset (while `useFormStatus` still reports the
 * pending submission), and the form is reset only after a successful action.
 */
export function Form<TData = unknown, TValidationErrors extends object = ValidationErrors>(
	props: Readonly<FormProps<TData, TValidationErrors>>,
): ReactNode {
	const { action, children, onSubmit, state, ...rest } = props;

	const formRef = useRef<HTMLFormElement>(null);

	useLayoutEffect(() => {
		if (isActionStateSuccess(state)) {
			formRef.current?.reset();
		}
	}, [state]);

	const onSubmitForm: NonNullable<AriaFormProps["onSubmit"]> = (event) => {
		onSubmit?.(event);

		if (event.defaultPrevented || typeof action !== "function") {
			return;
		}

		event.preventDefault();

		const { submitter } = event.nativeEvent as globalThis.SubmitEvent;
		const formData = new FormData(event.currentTarget, submitter);

		startTransition(async () => {
			await action(formData);
		});
	};

	return (
		<AriaForm
			ref={formRef}
			validationErrors={
				isActionStateError(state)
					? (state.validationErrors as AriaFormProps["validationErrors"])
					: undefined
			}
			{...rest}
			action={action}
			onSubmit={onSubmitForm}
		>
			{children}
		</AriaForm>
	);
}
