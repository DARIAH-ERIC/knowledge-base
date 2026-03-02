"use client";

import { assert } from "@acdh-oeaw/lib";
import type { ActionState } from "@dariah-eric/next-lib/actions";
import { createContext, use } from "react";

export const ActionStateContext = createContext<ActionState | null>(null);

export function useActionStateContext(): ActionState {
	const value = use(ActionStateContext);

	assert(value != null, "`useActionStateContext` must be used within an `ActionStateProvider`.");

	return value;
}
