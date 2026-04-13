import {
	contentBlockTypesEnum,
	SpotlightArticleSelectSchema,
	SpotlightArticleUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateSpotlightArticleActionInputSchema = v.object({
	...v.pick(SpotlightArticleSelectSchema, ["id"]).entries,
	...v.pick(SpotlightArticleUpdateSchema, ["title"]).entries,
	...v.pick(SpotlightArticleUpdateSchema, ["summary"]).entries,
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
