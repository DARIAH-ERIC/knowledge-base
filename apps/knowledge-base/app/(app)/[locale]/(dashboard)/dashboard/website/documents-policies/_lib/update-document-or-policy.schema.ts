import {
	DocumentOrPolicySelectSchema,
	DocumentOrPolicyUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockInputSchema } from "@/lib/content-block-input";

export const UpdateDocumentOrPolicyActionInputSchema = v.object({
	...v.pick(DocumentOrPolicySelectSchema, ["id"]).entries,
	...v.pick(DocumentOrPolicyUpdateSchema, ["title", "summary"]).entries,
	url: v.optional(v.string()),
	documentKey: v.pipe(v.string(), v.nonEmpty()),
	contentBlocks: v.optional(
		v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
		[],
	),
});
