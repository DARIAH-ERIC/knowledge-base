"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { type ReactNode, useActionState } from "react";
import { twMerge } from "tailwind-merge";

import type { ServerAction } from "@/lib/server/create-server-action";

interface ActionFormProps {
	action: ServerAction;
	/** Receives the pending flag, so the submit button can show progress. */
	children: (isPending: boolean) => ReactNode;
	className?: string;
}

/**
 * A single-purpose form (hidden inputs + one submit button) for a wrapped server action, which
 * shows the action's error message below the button instead of failing silently. `children` is a
 * render function, which cannot cross the Server Component boundary, so a server component must
 * render it through a small client wrapper (e.g. `ReportActionForm`).
 */
export function ActionForm(props: Readonly<ActionFormProps>): ReactNode {
	const { action, children, className } = props;

	const [state, formAction, isPending] = useActionState(action, createActionStateInitial());

	return (
		<form action={formAction} className={twMerge("flex flex-col items-start gap-y-2", className)}>
			{children(isPending)}
			<FormStatus state={state} />
		</form>
	);
}
