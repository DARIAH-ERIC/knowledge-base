"use client";

import {
	type ActionState,
	type ValidationErrors,
	isActionStateError,
	isActionStateSuccess,
} from "@dariah-eric/next-lib/actions";
import { type ReactNode, startTransition, useLayoutEffect, useRef } from "react";
import {
	Form as AriaForm,
	type FormProps as AriaFormProps,
	FormContext,
} from "react-aria-components";

export interface FormProps<
	TData = unknown,
	TValidationErrors extends object = ValidationErrors,
> extends AriaFormProps {
	children: ReactNode;
	/**
	 * Reset the form after a failed action. Only for forms whose input is useless after an error,
	 * e.g. a one-time code. To empty only some fields, e.g. passwords, see `getResetKeyOnError`.
	 */
	resetOnError?: boolean;
	/**
	 * Reset the form after a successful action. Only for forms which stay mounted to add another
	 * item, e.g. a contact form or an inline "add" form. An edit form must not reset: its fields
	 * already show the saved values, and react-aria fields reset to their value at mount.
	 */
	resetOnSuccess?: boolean;
	state: ActionState<TData, TValidationErrors>;
}

/**
 * React resets a form once its `action` has run, whatever the result, which would discard the
 * user's input whenever the server rejects it. So submissions are dispatched from `onSubmit`
 * instead, which React does not follow with a reset (while `useFormStatus` still reports the
 * pending submission). The form is reset only when `resetOnSuccess` or `resetOnError` is set.
 */
export function Form<TData = unknown, TValidationErrors extends object = ValidationErrors>(
	props: Readonly<FormProps<TData, TValidationErrors>>,
): ReactNode {
	const {
		action,
		children,
		onSubmit,
		resetOnError = false,
		resetOnSuccess = false,
		state,
		...rest
	} = props;

	const formRef = useRef<HTMLFormElement>(null);

	useLayoutEffect(() => {
		if (
			(resetOnSuccess && isActionStateSuccess(state)) ||
			(resetOnError && isActionStateError(state))
		) {
			formRef.current?.reset();
		}
	}, [resetOnError, resetOnSuccess, state]);

	const onSubmitForm: NonNullable<AriaFormProps["onSubmit"]> = (event) => {
		onSubmit?.(event);

		/**
		 * Only handle submissions of this form element: submit events of forms nested in the React
		 * tree, e.g. in a dialog, bubble up through portals.
		 */
		const form = formRef.current;
		if (form == null || event.target !== form) {
			return;
		}

		if (event.defaultPrevented || typeof action !== "function") {
			return;
		}

		event.preventDefault();

		const { submitter } = event.nativeEvent as globalThis.SubmitEvent;
		const formData = new FormData(form, submitter);

		startTransition(async () => {
			await action(formData);
		});
	};

	return (
		/**
		 * React-aria's `Form` provides all its props to descendants via `FormContext`, and a nested
		 * `Form` (e.g. in a dialog) would merge them into its own: chaining `onSubmit`, and inheriting
		 * `id`, `className` and `validationErrors`. A form must not inherit from an enclosing form.
		 *
		 * @see {@link https://github.com/adobe/react-spectrum/issues/10740}
		 */
		<FormContext.Provider value={null}>
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
		</FormContext.Provider>
	);
}

/**
 * A key which changes after each failed action. Fields keyed with it remount empty, e.g. password
 * fields, which should not keep a rejected password while the other fields keep their input.
 */
export function getResetKeyOnError<TData, TValidationErrors extends object>(
	state: ActionState<TData, TValidationErrors>,
): string {
	return isActionStateError(state) ? state.id : "";
}
