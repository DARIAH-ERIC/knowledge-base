import { contentBlockTypesEnum, EventInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

export const CreateEventActionInputSchema = v.object({
	...v.pick(EventInsertSchema, ["title", "summary", "location", "website"]).entries,
	duration: v.object({
		start: v.pipe(v.string(), v.isoDate(), v.toDate()),
		end: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
	}),
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
