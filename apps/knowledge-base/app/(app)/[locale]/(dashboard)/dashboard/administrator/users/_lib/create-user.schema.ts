import * as v from "valibot";

export const CreateUserActionInputSchema = v.object({
	name: v.pipe(v.string(), v.nonEmpty()),
	email: v.pipe(v.string(), v.email()),
	role: v.picklist(["admin", "user"] as const),
	password: v.pipe(v.string(), v.minLength(8)),
});
