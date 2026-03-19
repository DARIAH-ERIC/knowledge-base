import { ProjectSelectSchema, ProjectUpdateSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateProjectActionInputSchema = v.object({
	...v.pick(ProjectSelectSchema, ["id"]).entries,
	...v.pick(ProjectUpdateSchema, ["name", "scopeId", "summary"]).entries,
	acronym: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	call: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	duration: v.object({
		start: v.pipe(v.string(), v.isoDate(), v.toDate()),
		end: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
	}),
	funders: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	funding: v.nullish(v.pipe(v.string(), v.toNumber(), v.minValue(0)), null),
	topic: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	description: v.pipe(v.string(), v.nonEmpty()),
	partners: v.optional(
		v.array(
			v.object({
				id: v.optional(v.pipe(v.string(), v.uuid())),
				unitId: v.pipe(v.string(), v.uuid()),
				roleId: v.pipe(v.string(), v.uuid()),
				durationStart: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
				durationEnd: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
			}),
		),
		[],
	),
	socialMediaIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
});
