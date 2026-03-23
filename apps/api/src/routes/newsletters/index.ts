import { describeRoute } from "hono-openapi";

import { createRouter } from "@/lib/factory";
import { resolver } from "@/lib/openapi/resolver";
import { BAD_REQUEST } from "@/lib/openapi/responses";
import { validate, validator } from "@/lib/openapi/validator";
import { GetNewsletters } from "@/routes/newsletters/schemas";
import { getNewsletters } from "@/routes/newsletters/service";

export const router = createRouter()
	/**
	 * GET /api/newsletters
	 */
	.get(
		"/",
		describeRoute({
			tags: ["newsletters"],
			summary: "Get newsletters",
			description: "Retrieve a paginated list of newsletter campaigns from Mailchimp",
			operationId: "getNewsletters",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetNewsletters.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
			},
		}),
		validator("query", GetNewsletters.QuerySchema),
		async (c) => {
			const { limit, offset } = c.req.valid("query");

			const data = await getNewsletters({ limit, offset });

			const payload = await validate(GetNewsletters.ResponseSchema, data, 500);

			return c.json(payload);
		},
	);
