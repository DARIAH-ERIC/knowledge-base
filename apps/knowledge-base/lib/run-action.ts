import { type ActionState, isActionStateError } from "@dariah-eric/next-lib/actions";
import { unstable_rethrow as rethrow } from "next/navigation";

/**
 * Runs a server action from an event handler and returns the message to show when it fails, or null
 * on success.
 *
 * Covers both failure channels: a wrapped action (`createCommandAction` / `createServerAction`)
 * returns an error action state with a translated message, while an unwrapped one throws, and
 * Next.js redacts thrown server errors in production, so those fall back to `fallbackMessage`.
 *
 * An action that calls `redirect()` on success rejects with Next.js's redirect error, which is
 * rethrown so the router can follow it instead of being reported as a failure.
 */
export async function runAction(
	action: () => Promise<unknown>,
	fallbackMessage: string,
): Promise<string | null> {
	try {
		const state = await action();
		if (isActionState(state) && isActionStateError(state)) {
			const message = Array.isArray(state.message) ? state.message[0] : state.message;
			return message ?? fallbackMessage;
		}
		return null;
	} catch (error) {
		rethrow(error);
		return fallbackMessage;
	}
}

function isActionState(value: unknown): value is ActionState {
	return typeof value === "object" && value != null && "status" in value;
}
