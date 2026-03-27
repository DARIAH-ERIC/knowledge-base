import { contentBlockTypesEnum, PageInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreatePageItemActionInputSchema = v.object({
	...v.pick(PageInsertSchema, ["title", "summary"]).entries,
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
