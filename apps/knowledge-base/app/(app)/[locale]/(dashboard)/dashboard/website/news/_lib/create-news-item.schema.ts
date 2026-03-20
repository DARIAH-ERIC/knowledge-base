import { NewsItemInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateNewsItemActionInputSchema = v.object({
	...v.pick(NewsItemInsertSchema, ["title", "summary"]).entries,
	imageKey: v.pipe(v.string(), v.nonEmpty()),
	content: v.pipe(v.string(), v.nonEmpty()),
});
