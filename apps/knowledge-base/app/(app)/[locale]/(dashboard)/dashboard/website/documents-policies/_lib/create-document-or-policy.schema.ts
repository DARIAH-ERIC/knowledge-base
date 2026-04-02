import { contentBlockTypesEnum, DocumentOrPolicyInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateDocumentOrPolicyActionInputSchema = v.object({
	...v.pick(DocumentOrPolicyInsertSchema, ["title", "summary"]).entries,
	url: v.optional(v.string()),
	documentKey: v.pipe(v.string(), v.nonEmpty()),
	contentBlocks: v.optional(
		v.array(
			v.pipe(
				v.string(),
				v.parseJson(),
				v.object({
					id: v.string(),
					type: v.picklist(contentBlockTypesEnum),
					position: v.optional(v.number()),
					content: v.looseObject({}),
				}),
			),
		),
		[],
	),
});
