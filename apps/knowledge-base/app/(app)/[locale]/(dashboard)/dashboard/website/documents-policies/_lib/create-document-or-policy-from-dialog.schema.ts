import { DocumentOrPolicyInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateDocumentOrPolicyFromDialogActionInputSchema = v.object({
	...v.pick(DocumentOrPolicyInsertSchema, ["title", "summary"]).entries,
	url: v.optional(v.string()),
	groupId: v.optional(v.pipe(v.string(), v.uuid())),
	documentKey: v.pipe(v.string(), v.nonEmpty()),
});
