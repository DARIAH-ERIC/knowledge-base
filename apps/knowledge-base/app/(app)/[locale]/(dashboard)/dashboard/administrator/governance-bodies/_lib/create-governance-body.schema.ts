import { OrganisationalUnitInsertSchema } from "@dariah-eric/database/schema";
import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateGovernanceBodyActionInputSchema = v.object({
	...v.pick(OrganisationalUnitInsertSchema, ["name", "summary"]).entries,
	acronym: v.optional(v.pipe(v.string(), v.nonEmpty())),
	type: v.pipe(
		v.optional(v.string()),
		v.transform((value) => (value == null || value === "" ? null : value)),
		v.nullable(v.picklist(schema.governanceBodyMetadataTypesEnum)),
	),
	imageKey: v.optional(v.pipe(v.string(), v.nonEmpty())),
	description: v.pipe(v.string(), v.nonEmpty()),
	relatedEntityIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
	relatedResourceIds: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), []),
});
