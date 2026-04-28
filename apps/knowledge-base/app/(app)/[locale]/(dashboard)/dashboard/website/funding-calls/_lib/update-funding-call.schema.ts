import { FundingCallSelectSchema, FundingCallUpdateSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockInputSchema } from "@/lib/content-block-input";

export const UpdateFundingCallActionInputSchema = v.object({
	...v.pick(FundingCallSelectSchema, ["id"]).entries,
	...v.pick(FundingCallUpdateSchema, ["title", "summary"]).entries,
	duration: v.object({
		start: v.pipe(v.string(), v.isoDate(), v.toDate()),
		end: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
	}),
	contentBlocks: v.optional(
		v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
		[],
	),
});
