import {
	ImpactCaseStudySelectSchema,
	ImpactCaseStudyUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockInputSchema } from "@/lib/content-block-input";

export const UpdateImpactCaseStudyActionInputSchema = v.object({
	...v.pick(ImpactCaseStudySelectSchema, ["id"]).entries,
	...v.pick(ImpactCaseStudyUpdateSchema, ["title"]).entries,
	...v.pick(ImpactCaseStudyUpdateSchema, ["summary"]).entries,
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	contentBlocks: v.optional(
		v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
		[],
	),
});
