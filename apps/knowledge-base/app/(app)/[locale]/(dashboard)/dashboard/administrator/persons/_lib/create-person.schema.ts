import { PersonInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreatePersonActionInputSchema = v.object({
	...v.pick(PersonInsertSchema, ["email", "name", "orcid", "sortName"]).entries,
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	biography: v.pipe(v.string(), v.nonEmpty()),
});
