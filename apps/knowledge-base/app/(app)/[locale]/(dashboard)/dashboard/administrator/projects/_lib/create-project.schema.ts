import { ProjectInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateProjectActionInputSchema = v.object({
	...v.pick(ProjectInsertSchema, [
		"acronym",
		"call",
		"duration",
		"funders",
		"funding",
		"name",
		"scopeId",
		"summary",
		"topic",
	]).entries,
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	description: v.pipe(v.string(), v.nonEmpty()),
});
