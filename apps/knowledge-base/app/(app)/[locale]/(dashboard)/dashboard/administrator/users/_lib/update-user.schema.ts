import * as v from "valibot";

export const UpdateUserActionInputSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	name: v.pipe(v.string(), v.nonEmpty()),
	email: v.pipe(v.string(), v.email()),
	role: v.picklist(["admin", "user"] as const),
});
