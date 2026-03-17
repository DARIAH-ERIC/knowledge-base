import { ProjectSelectSchema, ProjectUpdateSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateProjectActionInputSchema = v.object({
	...v.pick(ProjectSelectSchema, ["id"]).entries,
	...v.pick(ProjectUpdateSchema, ["duration", "name", "scopeId", "summary"]).entries,
	acronym: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	call: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	funders: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	funding: v.nullish(v.pipe(v.string(), v.toNumber(), v.minValue(0)), null),
	topic: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	description: v.pipe(v.string(), v.nonEmpty()),
});
