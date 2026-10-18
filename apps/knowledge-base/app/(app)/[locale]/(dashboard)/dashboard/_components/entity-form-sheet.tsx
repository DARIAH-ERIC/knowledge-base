"use client";

import { type ActionState, createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import {
	SheetBody,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
} from "@dariah-eric/ui/sheet";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState } from "react";

import { ActionErrorAlert } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/action-error-alert";
import { FormLayout } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import type { ServerAction } from "@/lib/server/create-server-action";

interface EntityFormSheetProps<TData> {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	title: string;
	description: string;
	submitLabel: string;
	action: ServerAction;
	/** Called with the success data of `action`; the sheet closes itself afterwards. */
	onSuccess: (data: TData) => void;
	/** While the entity being edited is still loading, a spinner takes the form's place. */
	isLoading?: boolean;
	/**
	 * Why the entity being edited could not be loaded. Shown instead of the form: saving a form
	 * prefilled with partial values would overwrite the fields that failed to load.
	 */
	loadError?: string | null;
	/** The entity's form fields, plus any hidden inputs the action needs. */
	children: ReactNode;
}

/**
 * A side sheet holding a full entity form, so an entity can be created or edited without leaving
 * the form that needs it (e.g. to pick a person who is not yet in the system).
 */
export function EntityFormSheet<TData>(props: Readonly<EntityFormSheetProps<TData>>): ReactNode {
	const { isOpen, onOpenChange, title, description, isLoading = false, loadError } = props;

	const t = useExtracted();

	return (
		<SheetContent
			className="inline-full sm:max-inline-2xl"
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			position="end"
			// A long form is easy to lose to a stray click, Escape or swipe; close via Cancel or the X.
			preventDismissal={true}
		>
			<SheetHeader description={description} title={title} />
			{isLoading || loadError != null ? (
				<Fragment>
					<SheetBody>
						{isLoading ? (
							<ProgressCircle aria-label={t("Loading...")} isIndeterminate={true} />
						) : (
							<ActionErrorAlert message={loadError} />
						)}
					</SheetBody>
					<SheetFooter>
						<SheetClose>{t("Cancel")}</SheetClose>
					</SheetFooter>
				</Fragment>
			) : (
				// Mounted only while open, so every opening starts from fresh fields and state.
				<EntityFormSheetForm {...props} />
			)}
		</SheetContent>
	);
}

function EntityFormSheetForm<TData>(props: Readonly<EntityFormSheetProps<TData>>): ReactNode {
	const { onOpenChange, submitLabel, action, onSuccess, children } = props;

	const t = useExtracted();

	const [state, formAction, isPending] = useActionState(
		async (previousState: ActionState, formData: FormData) => {
			const newState = await action(previousState, formData);

			if (newState.status === "success") {
				onSuccess(newState.data as TData);
				onOpenChange(false);
			}

			return newState;
		},
		createActionStateInitial(),
	);

	return (
		<Form action={formAction} state={state}>
			<SheetBody>
				<FormLayout className="flex flex-col gap-y-6" variant="stacked">
					{children}
				</FormLayout>
			</SheetBody>
			<SheetFooter className="flex-col items-stretch sm:flex-col sm:items-end">
				<FormStatus state={state} />
				<div className="flex flex-col-reverse gap-3 sm:flex-row">
					<SheetClose>{t("Cancel")}</SheetClose>
					<Button isPending={isPending} type="submit">
						{isPending ? (
							<Fragment>
								<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
								<span aria-hidden={true}>{t("Saving...")}</span>
							</Fragment>
						) : (
							submitLabel
						)}
					</Button>
				</div>
			</SheetFooter>
		</Form>
	);
}
