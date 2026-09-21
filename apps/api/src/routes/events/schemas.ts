import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockSchema } from "@/lib/content-blocks";
import {
	ImageSchema,
	PaginatedResponseSchema,
	PaginationQuerySchema,
	RelatedEntitiesSchema,
	RelatedResourcesSchema,
} from "@/lib/schemas";

/**
 * Unlike the calendar-date `CalendarDateSchema` (day granularity), an event start/end is a full
 * timestamp because timed events carry a meaningful time-of-day. The sibling `isFullDay` flag says
 * how to read it.
 */
const EventDateTimeSchema = v.pipe(
	v.string(),
	v.isoTimestamp(),
	v.description(
		"Event date-time in UTC. The time-of-day is meaningful only for timed events (`isFullDay` = false); for an all-day event it is UTC midnight (start) or end-of-day 23:59:59 (end) and should be read as a calendar date. UTC stands in for the event's own timezone — do not convert to local time, or the day may shift.",
	),
);

const EventDurationSchema = v.object({
	start: EventDateTimeSchema,
	end: v.optional(EventDateTimeSchema),
});

const eventBaseObject = v.object({
	...v.pick(schema.EventSelectSchema, ["id", "title", "summary", "location", "isFullDay"]).entries,
	image: ImageSchema,
	duration: EventDurationSchema,
	entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	publishedAt: v.pipe(v.string(), v.isoTimestamp()),
});

export const EventBaseSchema = v.pipe(
	eventBaseObject,
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

export const EventLinkSchema = v.pipe(
	v.pick(eventBaseObject, ["id", "title", "location", "isFullDay", "duration", "entity"]),
	v.description("Link to adjacent event"),
	v.metadata({ ref: "EventLink" }),
);

export type EventLink = v.InferOutput<typeof EventLinkSchema>;

export const EventSchema = v.pipe(
	v.object({
		...v.pick(schema.EventSelectSchema, ["id", "title", "summary", "location", "isFullDay"])
			.entries,
		website: v.nullable(v.string()),
		image: ImageSchema,
		duration: EventDurationSchema,
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
		publishedAt: v.pipe(v.string(), v.isoTimestamp()),
		content: v.optional(v.array(ContentBlockSchema), []),
		links: v.object({
			prev: v.nullable(EventLinkSchema),
			next: v.nullable(EventLinkSchema),
		}),
		relatedEntities: v.optional(RelatedEntitiesSchema, []),
		relatedResources: v.optional(RelatedResourcesSchema, []),
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

export const eventDirectionValues = ["upcoming", "past"] as const;

export type EventDirection = (typeof eventDirectionValues)[number];

/**
 * Two ways to query the timeline, which must not be mixed:
 *
 * - `from` / `until` select a window by overlap. An event spanning the boundary date matches on both
 *   sides, which is what a calendar view wants.
 * - `anchor` + `direction` split the timeline at a date into two disjoint sides. An event spanning
 *   the anchor is `upcoming` only, so paging backward and forward from the anchor never shows it
 *   twice.
 */
export const EventsQuerySchema = v.pipe(
	v.object({
		...PaginationQuerySchema.entries,
		from: v.pipe(
			v.optional(v.pipe(v.string(), v.isoDate())),
			v.description(
				"Return only events whose duration overlaps with or extends beyond this date (YYYY-MM-DD). Combined with `until`, defines a window: events starting on or before `until` and ending on or after `from`. Results are sorted ascending (soonest first) when this parameter is set. Cannot be combined with `anchor`.",
			),
		),
		until: v.pipe(
			v.optional(v.pipe(v.string(), v.isoDate())),
			v.description(
				"Return only events that start on or before this date (YYYY-MM-DD); the whole day is included, so an event starting at any time on `until` matches. Combined with `from`, defines a window: events starting on or before `until` and ending on or after `from`. When used without `from`, results are sorted descending (most recently started first). Cannot be combined with `anchor`.",
			),
		),
		anchor: v.pipe(
			v.optional(v.pipe(v.string(), v.isoDate())),
			v.description(
				"Date (YYYY-MM-DD) at which to split the timeline into `upcoming` and `past` events; see `direction`. Every event falls on exactly one side, so paging away from the anchor in both directions never repeats an event. Pass today's date to walk the timeline from now. Cannot be combined with `from` or `until`.",
			),
		),
		direction: v.pipe(
			v.optional(v.picklist(eventDirectionValues)),
			v.description(
				"Which side of `anchor` to return. `upcoming` (default): events that end on or after the anchor, or are open-ended — this includes events already ongoing at the anchor — sorted ascending (soonest first). `past`: events that ended before the anchor, sorted descending (most recently started first). Requires `anchor`; cannot be combined with `from` or `until`.",
			),
		),
	}),
	v.check((query) => {
		const hasWindow = query.from != null || query.until != null;
		const hasWalk = query.anchor != null || query.direction != null;
		return !(hasWindow && hasWalk);
	}, "`from` / `until` cannot be combined with `anchor` / `direction`."),
	v.check(
		(query) => query.direction == null || query.anchor != null,
		"`direction` requires `anchor`.",
	),
);

export const GetEvents = {
	QuerySchema: EventsQuerySchema,
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
