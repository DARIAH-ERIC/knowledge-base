import { OrganisationalUnitInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateWorkingGroupActionInputSchema = v.object({
	...v.pick(OrganisationalUnitInsertSchema, ["name", "summary"]).entries,
	acronym: v.optional(v.pipe(v.string(), v.nonEmpty())),
	imageKey: v.optional(v.pipe(v.string(), v.nonEmpty())),
	description: v.pipe(v.string(), v.nonEmpty()),
	relatedEntityIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
	relatedResourceIds: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), []),
});
