import * as v from "valibot";

import { DocumentPolicyGroupUpdateSchema } from "@dariah-eric/database/schema";

export const UpdateDocumentPolicyGroupActionInputSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	...v.pick(DocumentPolicyGroupUpdateSchema, ["label"]).entries,
});
