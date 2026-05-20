import { OrganisationalUnitUpdateSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateWorkingGroupActionInputSchema = v.object({
	documentId: v.pipe(v.string(), v.uuid()),
	...v.pick(OrganisationalUnitUpdateSchema, ["name", "summary"]).entries,
	acronym: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	sshocMarketplaceActorId: v.pipe(
		v.string(),
		v.transform((value) => (value.trim() === "" ? null : Number(value))),
		v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1))),
	),
	imageKey: v.optional(v.pipe(v.string(), v.nonEmpty())),
	description: v.pipe(v.string(), v.nonEmpty()),
	relatedEntityIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
	relatedResourceIds: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), []),
	socialMediaIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
});
