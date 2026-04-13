import {
	contentBlockTypesEnum,
	NewsItemSelectSchema,
	NewsItemUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateNewsItemActionInputSchema = v.object({
	...v.pick(NewsItemSelectSchema, ["id"]).entries,
	...v.pick(NewsItemUpdateSchema, ["title"]).entries,
	...v.pick(NewsItemUpdateSchema, ["summary"]).entries,
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	contentBlocks: v.optional(
		v.array(
			v.pipe(
				v.string(),
				v.parseJson(),
				v.object({
					id: v.string(),
					type: v.picklist(contentBlockTypesEnum),
					position: v.optional(v.number()),
					content: v.optional(v.looseObject({})),
				}),
			),
		),
		[],
	),
});
