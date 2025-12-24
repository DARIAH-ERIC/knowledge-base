import { describeRoute } from "hono-openapi";

import { createRouter } from "@/lib/factory";
import { resolver } from "@/lib/openapi/resolver";
import { BAD_REQUEST, NOT_FOUND } from "@/lib/openapi/responses";
import { validate, validator } from "@/lib/openapi/validator";
import {
	GetSpotlightArticleById,
	GetSpotlightArticleBySlug,
	GetSpotlightArticles,
} from "@/routes/spotlight-articles/schemas";
import {
	getSpotlightArticleById,
	getSpotlightArticleBySlug,
	getSpotlightArticles,
} from "@/routes/spotlight-articles/service";

export const router = createRouter()
	/**
	 * GET /api/spotlight-articles
	 */
	.get(
		"/",
		describeRoute({
			tags: ["spotlight-articles"],
			summary: "Get spotlight articles",
			description: "Retrieve a paginated list of spotlight articles",
			operationId: "getSpotlightArticles",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetSpotlightArticles.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
			},
		}),
		validator("query", GetSpotlightArticles.QuerySchema),
		async (c) => {
			const { limit, offset } = c.req.valid("query");

			const data = await getSpotlightArticles({ limit, offset });

			const payload = await validate(GetSpotlightArticles.ResponseSchema, data);

			return c.json(payload);
		},
	)

	/**
	 * GET /api/spotlight-articles/:id
	 */
	.get(
		"/:id",
		describeRoute({
			tags: ["spotlight-articles"],
			summary: "Get spotlight article by id",
			description: "Retrieve an spotlight article by id",
			operationId: "getSpotlightArticleById",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetSpotlightArticleById.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetSpotlightArticleById.ParamsSchema),
		async (c) => {
			const { id } = c.req.valid("param");

			const data = await getSpotlightArticleById({ id });

			if (data == null) {
				return c.notFound();
			}

			const payload = await validate(GetSpotlightArticleById.ResponseSchema, data);

			return c.json(payload);
		},
	)

	/**
	 * GET /api/spotlight-articles/slugs/:slug
	 */
	.get(
		"/slugs/:slug",
		describeRoute({
			tags: ["spotlight-articles"],
			summary: "Get spotlight article by slug",
			description: "Retrieve an spotlight article by slug",
			operationId: "getSpotlightArticleBySlug",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetSpotlightArticleBySlug.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetSpotlightArticleBySlug.ParamsSchema),
		async (c) => {
			const { slug } = c.req.valid("param");

			const data = await getSpotlightArticleBySlug({ slug });

			if (data == null) {
				return c.notFound();
			}

			const payload = await validate(GetSpotlightArticleBySlug.ResponseSchema, data);

			return c.json(payload);
		},
	);
