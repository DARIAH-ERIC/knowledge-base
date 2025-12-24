import { describeRoute } from "hono-openapi";

import { createRouter } from "@/lib/factory";
import { resolver } from "@/lib/openapi/resolver";
import { BAD_REQUEST, NOT_FOUND } from "@/lib/openapi/responses";
import { validate, validator } from "@/lib/openapi/validator";
import { GetPageById, GetPageBySlug, GetPages } from "@/routes/pages/schemas";
import { getPageById, getPageBySlug, getPages } from "@/routes/pages/service";

export const router = createRouter()
	/**
	 * GET /api/pages
	 */
	.get(
		"/",
		describeRoute({
			tags: ["pages"],
			summary: "Get pages",
			description: "Retrieve a paginated list of pages",
			operationId: "getPages",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetPages.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
			},
		}),
		validator("query", GetPages.QuerySchema),
		async (c) => {
			const { limit, offset } = c.req.valid("query");

			const data = await getPages({ limit, offset });

			const payload = await validate(GetPages.ResponseSchema, data);

			return c.json(payload);
		},
	)

	/**
	 * GET /api/pages/:id
	 */
	.get(
		"/:id",
		describeRoute({
			tags: ["pages"],
			summary: "Get page by id",
			description: "Retrieve an page by id",
			operationId: "getPageById",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetPageById.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetPageById.ParamsSchema),
		async (c) => {
			const { id } = c.req.valid("param");

			const data = await getPageById({ id });

			if (data == null) {
				return c.notFound();
			}

			const payload = await validate(GetPageById.ResponseSchema, data);

			return c.json(payload);
		},
	)

	/**
	 * GET /api/pages/slugs/:slug
	 */
	.get(
		"/slugs/:slug",
		describeRoute({
			tags: ["pages"],
			summary: "Get page by slug",
			description: "Retrieve an page by slug",
			operationId: "getPageBySlug",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetPageBySlug.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetPageBySlug.ParamsSchema),
		async (c) => {
			const { slug } = c.req.valid("param");

			const data = await getPageBySlug({ slug });

			if (data == null) {
				return c.notFound();
			}

			const payload = await validate(GetPageBySlug.ResponseSchema, data);

			return c.json(payload);
		},
	);
