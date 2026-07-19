import { PageInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockInputSchema } from "@/lib/content-block-input";
import { EntityPathInputSchema } from "@/lib/entity-path-input";

export const CreatePageItemActionInputSchema = v.object({
	// A page's public address is its `path`; the slug is an internal handle derived from the title.
	path: EntityPathInputSchema,
	...v.pick(PageInsertSchema, ["title", "summary"]).entries,
	publicationDate: v.pipe(v.string(), v.isoDate(), v.toDate()),
	imageKey: v.optional(v.pipe(v.string(), v.nonEmpty())),
	contentBlocks: v.optional(
		v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
		[],
	),
	relatedEntityIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
	relatedResourceIds: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), []),
});
