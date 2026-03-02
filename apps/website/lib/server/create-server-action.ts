import { log } from "@acdh-oeaw/lib";
import {
	type ActionState,
	createActionStateError,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { unstable_rethrow as rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";

type ServerAction<
	TData = unknown,
	TValidationErrors extends ValidationErrors = ValidationErrors,
> = (
	state: ActionState<TData, TValidationErrors>,
	formData: FormData,
) => Promise<ActionState<TData, TValidationErrors>>;

export function createServerAction<
	TData = unknown,
	TValidationErrors extends ValidationErrors = ValidationErrors,
>(fn: ServerAction<TData, TValidationErrors>): ServerAction<TData, TValidationErrors> {
	return async (state: ActionState<TData, TValidationErrors>, formData: FormData) => {
		const e = await getTranslations();

		try {
			if (!(await globalPostRequestRateLimit())) {
				return createActionStateError({ message: e("errors.too-many-requests") });
			}

			return await fn(state, formData);
		} catch (error) {
			rethrow(error);

			log.error(error);

			return createActionStateError({
				formData,
				message: e("errors.internal-server-error"),
			});
		}
	};
}
