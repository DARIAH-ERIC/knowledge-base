import { PersonInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockInputSchema } from "@/lib/content-block-input";
import { EntitySlugInputSchema } from "@/lib/entity-slug-input";

export const CreatePersonActionInputSchema = v.object({
	...v.pick(PersonInsertSchema, ["email", "name", "orcid", "sortName"]).entries,
	slug: EntitySlugInputSchema,
	imageKey: v.optional(v.pipe(v.string(), v.nonEmpty())),
	biographyContentBlocks: v.optional(
		v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
		[],
	),
});
