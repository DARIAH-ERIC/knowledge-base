import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import * as v from "valibot";

import { PaginatedResponseSchema, PaginationQuerySchema } from "@/lib/schemas";

export const EventBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.EventSelectSchema, [
			"id",
			"title",
			"summary",
			"location",
			"duration",
			"isFullDay",
		]).entries,
		image: v.object({ url: v.string() }),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Event"),
	v.metadata({ ref: "EventBase" }),
);

export type EventBase = v.InferOutput<typeof EventBaseSchema>;

export const EventListSchema = v.pipe(
	v.array(EventBaseSchema),
	v.description("List of events"),
	v.metadata({ ref: "EventList" }),
);

export type EventList = v.InferOutput<typeof EventListSchema>;

export const EventSchema = v.pipe(
	v.object({
		...v.pick(schema.EventSelectSchema, [
			"id",
			"title",
			"summary",
			"location",
			"duration",
			"isFullDay",
		]).entries,
		image: v.object({ url: v.string() }),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Event"),
	v.metadata({ ref: "Event" }),
);

export type Event = v.InferOutput<typeof EventSchema>;

export const EventSlugSchema = v.pipe(
	v.object({
		...v.pick(schema.EventSelectSchema, ["id"]).entries,
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Event slug"),
	v.metadata({ ref: "EventSlug" }),
);

export type EventSlug = v.InferOutput<typeof EventSlugSchema>;

export const EventSlugListSchema = v.pipe(
	v.array(EventSlugSchema),
	v.description("List of event slugs"),
	v.metadata({ ref: "EventSlugList" }),
);

export type EventSlugList = v.InferOutput<typeof EventSlugListSchema>;

export const GetEvents = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: EventListSchema,
		}),
		v.description("Paginated list of events"),
		v.metadata({ ref: "GetEventsResponse" }),
	),
};

export const GetEventById = {
	ParamsSchema: v.pipe(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
		}),
		v.description("Get event by id params"),
		v.metadata({ ref: "GetEventByIdParams" }),
	),
	ResponseSchema: EventSchema,
};

export const GetEventSlugs = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: EventSlugListSchema,
		}),
		v.description("Paginated list of event slugs"),
		v.metadata({ ref: "GetEventSlugsResponse" }),
	),
};

export const GetEventBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get event by slug params"),
		v.metadata({ ref: "GetEventBySlugParams" }),
	),
	ResponseSchema: EventSchema,
};
