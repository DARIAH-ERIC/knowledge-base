import * as v from "valibot";

import { ImageSchema } from "@/lib/schemas";
import { AnnouncementSchema } from "@/routes/announcements/schemas";
import * as schema from "@dariah-eric/database/schema";

const FeaturedEventDateTimeSchema = v.pipe(v.string(), v.isoTimestamp());

const FeaturedEventSchema = v.pipe(
	v.object({
		type: v.literal("events"),
		...v.pick(schema.EventSelectSchema, ["id", "title", "summary", "location", "isFullDay"])
			.entries,
		image: ImageSchema,
		duration: v.object({
			start: FeaturedEventDateTimeSchema,
			end: v.optional(FeaturedEventDateTimeSchema),
		}),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
		publishedAt: v.pipe(v.string(), v.isoTimestamp()),
	}),
	v.description("Featured event"),
	v.metadata({ ref: "FeaturedEvent" }),
);

export const FeaturedEntitiesSchema = v.pipe(
	v.object({
		news: v.array(AnnouncementSchema),
		events: v.array(FeaturedEventSchema),
	}),
	v.description("Featured entities grouped by type"),
	v.metadata({ ref: "FeaturedEntities" }),
);

export type FeaturedEntities = v.InferOutput<typeof FeaturedEntitiesSchema>;

export const GetFeaturedEntities = {
	ResponseSchema: v.pipe(
		v.object({
			data: FeaturedEntitiesSchema,
		}),
		v.description("Featured entities"),
		v.metadata({ ref: "GetFeaturedEntitiesResponse" }),
	),
};
