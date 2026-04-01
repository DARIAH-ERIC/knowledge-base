import {
	contentBlockTypesEnum,
	DocumentOrPolicySelectSchema,
	DocumentOrPolicyUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateDocumentOrPolicyActionInputSchema = v.object({
	...v.pick(DocumentOrPolicySelectSchema, ["id"]).entries,
	...v.pick(DocumentOrPolicyUpdateSchema, ["title"]).entries,
	...v.pick(DocumentOrPolicyUpdateSchema, ["summary"]).entries,
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
