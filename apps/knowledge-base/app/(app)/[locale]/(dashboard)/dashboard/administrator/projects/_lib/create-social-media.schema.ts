import * as v from "valibot";

import * as schema from "@dariah-eric/database/schema";

export const CreateSocialMediaSchema = v.object({
	name: v.pipe(v.string(), v.nonEmpty()),
	url: v.pipe(v.string(), v.nonEmpty()),
	type: v.picklist(schema.socialMediaTypesEnum),
	duration: v.optional(
		v.object({
			start: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
			end: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
		}),
	),
});
