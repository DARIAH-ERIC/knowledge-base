import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import * as v from "valibot";

import { PaginationQuerySchema } from "@/lib/schemas";

export const EventBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.EventSelectSchema, [
			"id",
			"title",
			"summary",
			"location",
			"startDate",
			"endDate",
			"startTime",
			"endTime",
		]).entries,
		image: v.pick(schema.AssetSelectSchema, ["key"]),
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
			"startDate",
			"endDate",
			"startTime",
			"endTime",
		]).entries,
		image: v.pick(schema.AssetSelectSchema, ["key"]),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Event"),
	v.metadata({ ref: "Event" }),
);

export type Event = v.InferOutput<typeof EventSchema>;

export const GetEvents = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			data: EventListSchema,
			limit: v.number(),
			offset: v.number(),
			total: v.number(),
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
