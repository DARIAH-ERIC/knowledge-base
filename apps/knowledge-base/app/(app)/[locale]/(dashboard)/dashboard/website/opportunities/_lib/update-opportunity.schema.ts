import { OpportunitySelectSchema, OpportunityUpdateSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockInputSchema } from "@/lib/content-block-input";

export const UpdateOpportunityActionInputSchema = v.object({
	...v.pick(OpportunitySelectSchema, ["id"]).entries,
	...v.pick(OpportunityUpdateSchema, ["title", "summary", "sourceId", "website"]).entries,
	duration: v.object({
		start: v.pipe(v.string(), v.isoDate(), v.toDate()),
		end: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
	}),
	contentBlocks: v.optional(
		v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
		[],
	),
});
