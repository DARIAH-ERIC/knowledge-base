import {
	OrganisationalUnitSelectSchema,
	OrganisationalUnitUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateInstitutionActionInputSchema = v.object({
	...v.pick(OrganisationalUnitSelectSchema, ["id"]).entries,
	...v.pick(OrganisationalUnitUpdateSchema, ["name", "summary"]).entries,
	acronym: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	imageKey: v.optional(v.pipe(v.string(), v.nonEmpty())),
	description: v.pipe(v.string(), v.nonEmpty()),
	relatedEntityIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
	relatedResourceIds: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), []),
});
