import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { PageSelectSchema } from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { array, object, omit } from "valibot";
import { PaginationQuerySchema } from "../../lib/pagination";
import { getPages } from "../../lib/query-db";

export const pagesRoute = new Hono();

const PagesResponseSchema = object({
	...PaginationQuerySchema.entries,
	data: array(omit(PageSelectSchema, ["createdAt", "deletedAt", "updatedAt"])),
});

pagesRoute.get(
	"/",
	describeRoute({
		description: "Pages",
		responses: {
			200: {
				description: "Successful response",
				content: {
					"application/json": { schema: resolver(PagesResponseSchema) },
				},
			},
		},
	}),
	validator("query", PaginationQuerySchema),
	async (c) => {
		const { limit, offset } = c.req.valid("query");
		const data = await getPages({ limit, offset });
		return c.json({
			limit,
			offset,
			data,
		});
	},
);
