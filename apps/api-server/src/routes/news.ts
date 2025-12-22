import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { NewsItemSelectSchema } from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { array, object, omit } from "valibot";
import { PaginationQuerySchema } from "../lib/pagination";
import { getNews, getNewsItem } from "../lib/query-db";
import { PathParamsSchema } from "../lib/path";

export const newsRoute = new Hono();

const NewsResponseSchema = object({
	...PaginationQuerySchema.entries,
	data: array(omit(NewsItemSelectSchema, ["createdAt", "deletedAt", "updatedAt"])),
});

const NewsItemResponseSchema = omit(NewsItemSelectSchema, ["createdAt", "deletedAt", "updatedAt"]);

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

newsRoute.get(
	"/:id",
	describeRoute({
		description: "News Item",
		responses: {
			200: {
				description: "Successful response",
				content: {
					"application/json": { schema: resolver(NewsItemResponseSchema) },
				},
			},
		},
	}),
	validator("param", PathParamsSchema),
	async (c) => {
		const { id } = c.req.valid("param");
		const data = await getNewsItem({ id });
		return c.json(data);
	},
);
