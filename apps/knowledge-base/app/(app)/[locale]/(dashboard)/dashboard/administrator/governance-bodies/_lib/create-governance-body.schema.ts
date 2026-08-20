import { OrganisationalUnitInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockInputSchema } from "@/lib/content-block-input";
import { EntitySlugInputSchema } from "@/lib/entity-slug-input";

export const CreateGovernanceBodyActionInputSchema = v.object({
	slug: EntitySlugInputSchema,
	...v.pick(OrganisationalUnitInsertSchema, ["name", "summary"]).entries,
	acronym: v.optional(v.pipe(v.string(), v.nonEmpty())),
	mailingList: v.nullish(
		v.union(
			[v.pipe(v.string(), v.email()), v.pipe(v.string(), v.url())],
			"Enter a valid email address or URL.",
		),
		null,
	),
	imageKey: v.optional(v.pipe(v.string(), v.nonEmpty())),
	descriptionContentBlocks: v.optional(
		v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
		[],
	),
	relatedEntityIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
	relatedResourceIds: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), []),
	socialMediaIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
});
