import * as v from "valibot";

import { ContentBlockInputSchema } from "@/lib/content-block-input";
import { EntitySlugInputSchema } from "@/lib/entity-slug-input";
import { DocumentationPageInsertSchema } from "@dariah-eric/database/schema";

export const CreateDocumentationPageActionInputSchema = v.object({
	slug: EntitySlugInputSchema,
	...v.pick(DocumentationPageInsertSchema, ["title"]).entries,
	contentBlocks: v.optional(
		v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
		[],
	),
});
