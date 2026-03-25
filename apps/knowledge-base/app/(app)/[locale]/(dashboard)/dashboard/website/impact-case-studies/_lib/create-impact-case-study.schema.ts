import { contentBlockTypesEnum, ImpactCaseStudyInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateImpactCaseStudyActionInputSchema = v.object({
	...v.pick(ImpactCaseStudyInsertSchema, ["title", "summary"]).entries,
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	contentBlocks: v.array(
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
});
