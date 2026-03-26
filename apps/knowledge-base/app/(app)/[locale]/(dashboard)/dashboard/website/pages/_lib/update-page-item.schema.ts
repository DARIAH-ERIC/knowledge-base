import {
	contentBlockTypesEnum,
	PageSelectSchema,
	PageUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdatePageItemActionInputSchema = v.object({
	...v.pick(PageSelectSchema, ["id"]).entries,
	...v.pick(PageUpdateSchema, ["title"]).entries,
	...v.pick(PageUpdateSchema, ["summary"]).entries,
	imageKey: v.optional(v.pipe(v.string(), v.nonEmpty())),
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
