import { OrganisationalUnitUpdateSchema } from "@dariah-eric/database/schema";
import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateGovernanceBodyActionInputSchema = v.object({
	documentId: v.pipe(v.string(), v.uuid()),
	...v.pick(OrganisationalUnitUpdateSchema, ["name", "summary"]).entries,
	acronym: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
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
