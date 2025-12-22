import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { EventSelectSchema } from "../../../database-client/src/schema/events";
import { array, object, omit } from "valibot";
import { PaginationQuerySchema } from "../../lib/pagination";
import { getEvents } from "../../lib/query-db";

export const eventsRoute = new Hono();

const EventsResponseSchema = object({
	...PaginationQuerySchema.entries,
	data: array(omit(EventSelectSchema, ["createdAt", "deletedAt", "updatedAt"])),
});

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
		const { page, pageSize } = c.req.valid("query");
		const data = await getEvents({ page, pageSize });
		return c.json({
			page,
			pageSize,
			data,
		});
	},
);
