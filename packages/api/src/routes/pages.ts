import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { PageSelectSchema } from "../../../database-client/src/schema/pages";
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
		const { page, pageSize } = c.req.valid("query");
		const data = await getPages({ page, pageSize });
		return c.json({
			page,
			pageSize,
			data,
		});
	},
);
