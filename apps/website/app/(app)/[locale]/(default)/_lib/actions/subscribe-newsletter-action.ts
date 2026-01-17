"use server";

import { getFormDataValues, HttpError, isErr, log } from "@acdh-oeaw/lib";
import { getTranslations } from "next-intl/server";
import * as v from "valibot";

import { client } from "@/lib/mailchimp/client";
import {
	type ActionState,
	createErrorActionState,
	createSuccessActionState,
} from "@/lib/server/actions";
import { globalPOSTRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

// FIXME: currently the subscription form requires first and last name.
// can we change to a full name field? (dependent on required merge_fields)
const FormDataSchema = v.object({
	email: v.pipe(v.string(), v.email()),
	firstName: v.pipe(v.string(), v.nonEmpty()),
	lastName: v.pipe(v.string(), v.nonEmpty()),
	institution: v.optional(v.pipe(v.string(), v.nonEmpty())),
});

export async function subscribeNewsletterAction(
	previousActionState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const t = await getTranslations("actions.subscribeNewsletterAction");
	const e = await getTranslations("errors");

	try {
		if (!(await globalPOSTRateLimit())) {
			return createErrorActionState({ message: e("too-many-requests") });
		}

		const validation = await v.safeParseAsync(FormDataSchema, getFormDataValues(formData));

		if (!validation.success) {
			const errors = v.flatten<typeof FormDataSchema>(validation.issues);

			return createErrorActionState({
				message: errors.root ?? e("invalid-form-fields"),
				errors: errors.nested,
			});
		}

		const { email, firstName, institution, lastName } = validation.output;

		const result = await client.subscribe({ email, firstName, institution, lastName });

		if (isErr(result)) {
			if (HttpError.is(result.error) && result.error.response.status === 214) {
				return createErrorActionState({ message: t("already-subscribed") });
			}

			return createErrorActionState({ message: t("error") });
		}

		return createSuccessActionState({ message: t("success") });
	} catch (error) {
		log.error(error);

		return createErrorActionState({ message: e("internal-server-error") });
	}
}
