import { DocumentOrPolicyInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockInputSchema } from "@/lib/content-block-input";

export const CreateDocumentOrPolicyActionInputSchema = v.object({
	...v.pick(DocumentOrPolicyInsertSchema, ["title", "summary"]).entries,
	url: v.optional(v.string()),
	groupId: v.optional(v.pipe(v.string(), v.uuid())),
	documentKey: v.pipe(v.string(), v.nonEmpty()),
	contentBlocks: v.optional(
		v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
		[],
	),
});
