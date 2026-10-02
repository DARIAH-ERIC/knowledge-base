import { type ActionState, isActionStateError } from "@dariah-eric/next-lib/actions";

/**
 * Runs a server action from an event handler and returns the message to show when it fails, or null
 * on success.
 *
 * Covers both failure channels: a wrapped action (`createCommandAction` / `createServerAction`)
 * returns an error action state with a translated message, while an unwrapped one throws, and
 * Next.js redacts thrown server errors in production, so those fall back to `fallbackMessage`.
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
	} catch {
		return fallbackMessage;
	}
}

function isActionState(value: unknown): value is ActionState {
	return typeof value === "object" && value != null && "status" in value;
}
