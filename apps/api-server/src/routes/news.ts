import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { NewsItemSelectSchema } from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { array, object, omit } from "valibot";
import { PaginationQuerySchema } from "../lib/pagination";
import { getNews } from "../lib/query-db";

export const newsRoute = new Hono();

const NewsResponseSchema = object({
	...PaginationQuerySchema.entries,
	data: array(omit(NewsItemSelectSchema, ["createdAt", "deletedAt", "updatedAt"])),
});

newsRoute.get(
	"/",
	describeRoute({
		description: "News",
		responses: {
			200: {
				description: "Successful response",
				content: {
					"application/json": { schema: resolver(NewsResponseSchema) },
				},
			},
		},
	}),
	validator("query", PaginationQuerySchema),
	async (c) => {
		const { limit, offset } = c.req.valid("query");
		const data = await getNews({ limit, offset });
		return c.json({
			limit,
			offset,
			data,
		});
	},
);
