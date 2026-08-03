"use client";

import { assert } from "@acdh-oeaw/lib";
import { createContext, use } from "react";

import type { ActionState } from "@dariah-eric/next-lib/actions";

export const ActionStateContext = createContext<ActionState | null>(null);

export function useActionStateContext(): ActionState {
	const value = use(ActionStateContext);

	assert(value != null, "`useActionStateContext` must be used within an `ActionStateProvider`.");

	return value;
}
