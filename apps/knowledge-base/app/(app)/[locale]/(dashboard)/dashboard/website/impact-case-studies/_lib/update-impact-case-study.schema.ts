import {
	contentBlockTypesEnum,
	ImpactCaseStudySelectSchema,
	ImpactCaseStudyUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateImpactCaseStudyActionInputSchema = v.object({
	...v.pick(ImpactCaseStudySelectSchema, ["id"]).entries,
	...v.pick(ImpactCaseStudyUpdateSchema, ["title"]).entries,
	...v.pick(ImpactCaseStudyUpdateSchema, ["summary"]).entries,
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
