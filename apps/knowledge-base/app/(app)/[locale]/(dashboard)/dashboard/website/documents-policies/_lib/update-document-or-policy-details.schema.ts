import {
	DocumentOrPolicySelectSchema,
	DocumentOrPolicyUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateDocumentOrPolicyDetailsActionInputSchema = v.object({
	...v.pick(DocumentOrPolicySelectSchema, ["id"]).entries,
	...v.pick(DocumentOrPolicyUpdateSchema, ["title", "summary"]).entries,
	url: v.optional(v.string()),
	groupId: v.optional(v.pipe(v.string(), v.uuid())),
	documentKey: v.pipe(v.string(), v.nonEmpty()),
});
