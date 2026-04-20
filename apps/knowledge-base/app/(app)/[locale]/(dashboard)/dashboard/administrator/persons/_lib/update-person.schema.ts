import { PersonSelectSchema, PersonUpdateSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdatePersonActionInputSchema = v.object({
	...v.pick(PersonSelectSchema, ["id"]).entries,
	...v.pick(PersonUpdateSchema, ["name", "position", "sortName"]).entries,
	email: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	orcid: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	biography: v.pipe(v.string(), v.nonEmpty()),
});
