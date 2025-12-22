import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { SpotlightArticleSelectSchema } from "../../../database-client/src/schema/spotlight-articles";
import { array, object, omit } from "valibot";
import { PaginationQuerySchema } from "../../lib/pagination";
import { getSpotLightArticles } from "../../lib/query-db";

export const spotlightArticlesRoute = new Hono();

const SpotlightArticlesResponseSchema = object({
	...PaginationQuerySchema.entries,
	data: array(omit(SpotlightArticleSelectSchema, ["createdAt", "deletedAt", "updatedAt"])),
});

spotlightArticlesRoute.get(
	"/",
	describeRoute({
		description: "Spotlight Articles",
		responses: {
			200: {
				description: "Successful response",
				content: {
					"application/json": { schema: resolver(SpotlightArticlesResponseSchema) },
				},
			},
		},
	}),
	validator("query", PaginationQuerySchema),
	async (c) => {
		const { page, pageSize } = c.req.valid("query");
		const data = await getSpotLightArticles({ page, pageSize });
		return c.json({
			page,
			pageSize,
			data,
		});
	},
);
