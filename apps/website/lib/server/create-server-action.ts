import { log } from "@acdh-oeaw/lib";
import {
	type ActionState,
	type ValidationErrors,
	createActionStateError,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getTranslations } from "next-intl/server";
import { unstable_rethrow as rethrow } from "next/navigation";

export type ServerAction<TData = unknown, TValidationErrors extends object = ValidationErrors> = (
	state: ActionState<TData, TValidationErrors>,
	formData: FormData,
) => Promise<ActionState<TData, TValidationErrors>>;

export function createServerAction<
	TData = unknown,
	TValidationErrors extends object = ValidationErrors,
>(fn: ServerAction<TData, TValidationErrors>): ServerAction<TData, TValidationErrors> {
	return async (state: ActionState<TData, TValidationErrors>, formData: FormData) => {
		const e = await getTranslations();

		try {
			if (!(await globalPostRequestRateLimit())) {
				return createActionStateError<TValidationErrors>({
					message: e("errors.too-many-requests"),
				});
			}

			return await fn(state, formData);
		} catch (error) {
			rethrow(error);

			log.error(error);

			return createActionStateError<TValidationErrors>({
				formData,
				message: e("errors.internal-server-error"),
			});
		}
	};
}
