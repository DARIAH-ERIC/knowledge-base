import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { EventSelectSchema } from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { array, object, omit } from "valibot";
import { PaginationQuerySchema } from "../lib/pagination";
import { getEvent, getEvents } from "../lib/query-db";
import { PathParamsSchema } from "../lib/path";

export const eventsRoute = new Hono();

const EventsResponseSchema = object({
	...PaginationQuerySchema.entries,
	data: array(omit(EventSelectSchema, ["createdAt", "deletedAt", "updatedAt"])),
});

const EventResponseSchema = omit(EventSelectSchema, ["createdAt", "deletedAt", "updatedAt"]);

eventsRoute.get(
	"/",
	describeRoute({
		description: "Events",
		responses: {
			200: {
				description: "Successful response",
				content: {
					"application/json": { schema: resolver(EventsResponseSchema) },
				},
			},
		},
	}),
	validator("query", PaginationQuerySchema),
	async (c) => {
		const { limit, offset } = c.req.valid("query");
		const data = await getEvents({ limit, offset });
		return c.json({
			limit,
			offset,
			data,
		});
	},
);

eventsRoute.get(
	"/:id",
	describeRoute({
		description: "Event",
		responses: {
			200: {
				description: "Successful response",
				content: {
					"application/json": { schema: resolver(EventResponseSchema) },
				},
			},
		},
	}),
	validator("param", PathParamsSchema),
	async (c) => {
		const { id } = c.req.valid("param");
		const data = await getEvent({ id });
		return c.json(data);
	},
);
