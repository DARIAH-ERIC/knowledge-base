import { PageUpdateSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockInputSchema } from "@/lib/content-block-input";
import { EntityPathInputSchema } from "@/lib/entity-path-input";

export const UpdatePageItemActionInputSchema = v.object({
	// A page's public address is its `path`; the slug is an internal, auto-derived handle.
	path: EntityPathInputSchema,
	documentId: v.pipe(v.string(), v.uuid()),
	...v.pick(PageUpdateSchema, ["title"]).entries,
	...v.pick(PageUpdateSchema, ["summary"]).entries,
	publicationDate: v.pipe(v.string(), v.isoDate(), v.toDate()),
	imageKey: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	contentBlocks: v.optional(
		v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
		[],
	),
	relatedEntityIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
	relatedResourceIds: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), []),
});
