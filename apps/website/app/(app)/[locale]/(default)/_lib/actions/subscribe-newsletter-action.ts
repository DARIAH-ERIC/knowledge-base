"use server";

import { getFormDataValues, HttpError, isErr } from "@acdh-oeaw/lib";
import * as v from "valibot";

import { client } from "@/lib/mailchimp/client";
import {
	type ActionState,
	createErrorActionState,
	createSuccessActionState,
} from "@/lib/server/actions";

// FIXME: currently the subscription form requires first and last name.
// can we change to a full name field? (dependent on required merge_fields)
const Schema = v.object({
	email: v.pipe(v.string(), v.email()),
	firstName: v.pipe(v.string(), v.nonEmpty()),
	lastName: v.pipe(v.string(), v.nonEmpty()),
	institution: v.optional(v.pipe(v.string(), v.nonEmpty())),
});

export async function subscribeNewsletterAction(
	previousActionState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	try {
		const { email, firstName, institution, lastName } = await v.parseAsync(
			Schema,
			getFormDataValues(formData),
		);

		const result = await client.subscribe({
			email,
			firstName,
			lastName,
			institution,
		});

		if (isErr(result)) {
			if (HttpError.is(result.error) && result.error.response.status === 214) {
				return createErrorActionState({
					message: "Already subscribed to newsletter mailing list.",
				});
			}

			// TODO:
			return createErrorActionState({
				message: "Failed to add to newsletter mailing list.",
			});
		}

		// TODO:
		return createSuccessActionState({
			message: "Successfully subscribed to newsletter mailing list.",
		});
	} catch {
		// TODO:
		return createErrorActionState({
			message: "Internal server error.",
		});
	}
}
