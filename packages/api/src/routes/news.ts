import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { NewsItemSelectSchema } from "../../../database-client/src/schema/news";
import { array, object, omit } from "valibot";
import { PaginationQuerySchema } from "../../lib/pagination";
import { getNews } from "../../lib/query-db";

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
		const { page, pageSize } = c.req.valid("query");
		const data = await getNews({ page, pageSize });
		return c.json({
			page,
			pageSize,
			data,
		});
	},
);
