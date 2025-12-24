import { describeRoute } from "hono-openapi";

import { createRouter } from "@/lib/factory";
import { resolver } from "@/lib/openapi/resolver";
import { BAD_REQUEST, NOT_FOUND } from "@/lib/openapi/responses";
import { validate, validator } from "@/lib/openapi/validator";
import { GetNews, GetNewsItemById, GetNewsItemBySlug } from "@/routes/news/schemas";
import { getNews, getNewsItemById, getNewsItemBySlug } from "@/routes/news/service";

export const router = createRouter()
	/**
	 * GET /api/news
	 */
	.get(
		"/",
		describeRoute({
			tags: ["news"],
			summary: "Get news",
			description: "Retrieve a paginated list of news",
			operationId: "getNews",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetNews.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
			},
		}),
		validator("query", GetNews.QuerySchema),
		async (c) => {
			const { limit, offset } = c.req.valid("query");

			const data = await getNews({ limit, offset });

			const payload = await validate(GetNews.ResponseSchema, data);

			return c.json(payload);
		},
	)

	/**
	 * GET /api/news/:id
	 */
	.get(
		"/:id",
		describeRoute({
			tags: ["news"],
			summary: "Get news item by id",
			description: "Retrieve an news item by id",
			operationId: "getNewsItemById",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetNewsItemById.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetNewsItemById.ParamsSchema),
		async (c) => {
			const { id } = c.req.valid("param");

			const data = await getNewsItemById({ id });

			if (data == null) {
				return c.notFound();
			}

			const payload = await validate(GetNewsItemById.ResponseSchema, data);

			return c.json(payload);
		},
	)

	/**
	 * GET /api/news/slugs/:slug
	 */
	.get(
		"/slugs/:slug",
		describeRoute({
			tags: ["news"],
			summary: "Get news item by slug",
			description: "Retrieve an news item by slug",
			operationId: "getNewsItemBySlug",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetNewsItemBySlug.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetNewsItemBySlug.ParamsSchema),
		async (c) => {
			const { slug } = c.req.valid("param");

			const data = await getNewsItemBySlug({ slug });

			if (data == null) {
				return c.notFound();
			}

			const payload = await validate(GetNewsItemBySlug.ResponseSchema, data);

			return c.json(payload);
		},
	);
