import * as v from "valibot";

// FIXME: currently the subscription form requires first and last name.
// can we change to a full name field? (dependent on required merge_fields)

export const SubscribeNewsletterInputSchema = v.object({
	email: v.pipe(v.string(), v.email()),
	firstName: v.pipe(v.string(), v.nonEmpty()),
	lastName: v.pipe(v.string(), v.nonEmpty()),
	institution: v.optional(v.pipe(v.string(), v.nonEmpty())),
});
