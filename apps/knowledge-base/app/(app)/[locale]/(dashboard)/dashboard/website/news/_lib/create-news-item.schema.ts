import { contentBlockTypesEnum, NewsItemInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateNewsItemActionInputSchema = v.object({
	...v.pick(NewsItemInsertSchema, ["title", "summary"]).entries,
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
