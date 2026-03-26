import { contentBlockTypesEnum, SpotlightArticleInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateSpotlightArticleActionInputSchema = v.object({
	...v.pick(SpotlightArticleInsertSchema, ["title", "summary"]).entries,
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
					content: v.looseObject({}),
				}),
			),
		),
		[],
	),
});
