import * as v from "valibot";

export const SubscribeNewsletterInputSchema = v.object({
	email: v.pipe(v.string(), v.email()),
});
