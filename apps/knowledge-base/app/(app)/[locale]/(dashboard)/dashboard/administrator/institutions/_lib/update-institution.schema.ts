import {
	OrganisationalUnitSelectSchema,
	OrganisationalUnitUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateInstitutionActionInputSchema = v.object({
	...v.pick(OrganisationalUnitSelectSchema, ["id"]).entries,
	...v.pick(OrganisationalUnitUpdateSchema, ["name", "summary"]).entries,
	summary: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	acronym: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	ror: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	documentId: v.pipe(v.string(), v.uuid()),
	imageKey: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	description: v.pipe(v.string(), v.nonEmpty()),
	relatedEntityIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
	relatedResourceIds: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), []),
	socialMediaIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
});
