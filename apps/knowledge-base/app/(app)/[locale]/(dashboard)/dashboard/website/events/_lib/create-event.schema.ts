import { EventInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateEventActionInputSchema = v.object({
	...v.pick(EventInsertSchema, ["title", "summary"]).entries,
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	content: v.pipe(v.string(), v.nonEmpty()),
});
