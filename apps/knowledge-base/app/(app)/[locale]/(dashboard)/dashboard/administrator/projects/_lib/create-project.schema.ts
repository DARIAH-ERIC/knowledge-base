import { ProjectInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateProjectActionInputSchema = v.object({
	...v.pick(ProjectInsertSchema, [
		"acronym",
		"call",
		"funders",
		"funding",
		"name",
		"scopeId",
		"summary",
		"topic",
	]).entries,
	duration: v.object({
		start: v.pipe(v.string(), v.isoDate(), v.toDate()),
		end: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
	}),
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	description: v.pipe(v.string(), v.nonEmpty()),
});
