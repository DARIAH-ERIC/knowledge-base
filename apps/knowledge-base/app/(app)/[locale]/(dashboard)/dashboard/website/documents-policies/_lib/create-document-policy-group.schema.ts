import * as v from "valibot";

import { DocumentPolicyGroupInsertSchema } from "@dariah-eric/database/schema";

export const CreateDocumentPolicyGroupActionInputSchema = v.object({
	...v.pick(DocumentPolicyGroupInsertSchema, ["label"]).entries,
});
