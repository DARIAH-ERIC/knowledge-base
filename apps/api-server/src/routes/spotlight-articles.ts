import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { SpotlightArticleSelectSchema } from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { array, object, omit } from "valibot";
import { PaginationQuerySchema } from "../lib/pagination";
import { getSpotLightArticle, getSpotLightArticles } from "../lib/query-db";
import { PathParamsSchema } from "../lib/path";

export const spotlightArticlesRoute = new Hono();

const SpotlightArticlesResponseSchema = object({
	...PaginationQuerySchema.entries,
	data: array(omit(SpotlightArticleSelectSchema, ["createdAt", "deletedAt", "updatedAt"])),
});

const SpotlightArticleResponseSchema = omit(SpotlightArticleSelectSchema, [
	"createdAt",
	"deletedAt",
	"updatedAt",
]);

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
		const { limit, offset } = c.req.valid("query");
		const data = await getSpotLightArticles({ limit, offset });
		return c.json({
			limit,
			offset,
			data,
		});
	},
);

spotlightArticlesRoute.get(
	"/:id",
	describeRoute({
		description: "Spotlight Article",
		responses: {
			200: {
				description: "Successful response",
				content: {
					"application/json": { schema: resolver(SpotlightArticleResponseSchema) },
				},
			},
		},
	}),
	validator("param", PathParamsSchema),
	async (c) => {
		const { id } = c.req.valid("param");
		const data = await getSpotLightArticle({ id });
		return c.json(data);
	},
);
